const functions = require("firebase-functions");
const admin = require(`${__dirname}/firebase`)

const firestore = admin.firestore();
const HOURS_THRESHOLD = 24 // in hours

const computeVotePercentage = (task) => {
    if (task?.votes?.length > 0) {
        let score = 0
        task.votes.map((vote) => {
            if (vote.mission_relevance) {
                score++
            }
        })
        const percentage =  Math.round((score/task.votes.length)*100)
        return {yes: percentage, no: 100-percentage}
    } else {
        return {yes: 0, no: 100}
    }
}

const computeRefusalReason = (task) => {
    let reasonMap = [];
    let maxReason = null;
    let maxFreq = null
    if (task?.votes?.length > 0) {
        task.votes.map((vote) => {
            if (vote.reason) {
                if (!reasonMap.some((item) => (item.reason === vote.reason) || (item.reason === vote.other_precision))) {
                    reasonMap.push({ reason: vote.reason === "Autres" ? vote.other_precision : vote.reason, freq: 1, });
                } else {
                    let update = [...reasonMap]
                    update[update.findIndex((item) => (item.reason === vote?.reason) || (item.reason === vote?.other_precision))].freq = update[update.findIndex((item) => (item.reason === vote?.reason) || (item.reason === vote?.other_precision))].freq+1
                    reasonMap = update
                }
            }
        });
        if (reasonMap.length > 0) {
            maxFreq = Math.max(...reasonMap.map((item) => item.freq));
            maxReason = reasonMap.filter((item) => item.freq === maxFreq)[0].reason;
            reasonMap.sort((a, b) => a.freq + b.freq);
        }
    }
    return {maxReason: maxReason, maxFreq: maxFreq, reasonMap: reasonMap};
};

function roundUpOrDown(n) {
    const decimal = n % 1;
    if (decimal > 0.5) {
        return Math.ceil(n);
    } else {
        return Math.floor(n);
    }
}

const computeDifficulty = (task) => {
    if (task?.votes?.length > 0) {
        let diffSum = 0
        let buff = []
        task.votes.map((vote) => {
            if (vote?.missionDifficulty) {
                diffSum+=Number(vote.missionDifficulty)
                buff.push(".")
            }
        })
        return roundUpOrDown(diffSum/buff.length)
    }
    return null
}

const manageTaskIndexing = (task) => {
    const data = task.data()
    task
        .ref
        .delete()
        .then(() => {
            firestore
                .collection("taskers")
                .doc(data.creator)
                .update({ongoing_task: null})
                .then(() => {
                    if (computeVotePercentage(data).yes > 50) {
                        firestore
                            .collection("available_tasks")
                            .add({
                                uid: null,
                                title: data.title,
                                description: data.description,
                                creator: data.creator,
                                creation_date: admin.firestore.FieldValue.serverTimestamp(),
                                location: data.location,
                                images: data.images,
                                difficulty: computeDifficulty(data),
                                chooser: null,
                                shares: [],
                                votes: data.votes,
                                blacklist: [],
                                original_task: data.uid
                            })
                            .then((snapshot) => {
                                firestore
                                    .collection("available_tasks")
                                    .doc(snapshot.id)
                                    .update({uid: snapshot.id})
                                    .then(() => console.log(`Indexing of ${data.uid} (${data.title}) done 1/2`))
                                    .catch((error) => console.error(error))
                                    .finally(() => {
                                        firestore
                                            .collection("accepted_tasks")
                                            .add({
                                                uid: null,
                                                title: data.title,
                                                description: data.description,
                                                creator: data.creator,
                                                creation_date: data.creation_date,
                                                acceptance_date: admin.firestore.FieldValue.serverTimestamp(),
                                                location: data.location,
                                                images: data.images,
                                                comments: data.comments,
                                                shares: data.shares,
                                                votes: data.votes,
                                                hasBeenModified: data.hasBeenModified,
                                                main_refusal_reason: computeRefusalReason(data).maxReason,
                                                reasons_list: computeRefusalReason(data).reasonMap,
                                                difficulty: computeDifficulty(data),
                                            })
                                            .then((snapshot) => {
                                                firestore
                                                    .collection("accepted_tasks")
                                                    .doc(snapshot.id)
                                                    .update({uid: snapshot.id})
                                                    .then(() => console.log(`Indexing of ${data.uid} (${data.title}) done 2/2`))
                                                    .catch((error) => console.error(error))
                                            })
                                    })
                            })
                            .catch((error) => console.error(error))
                    } else {
                        firestore
                            .collection("refused_tasks")
                            .add({
                                uid: null,
                                title: data.title,
                                description: data.description,
                                creator: data.creator,
                                creation_date: data.creation_date,
                                refusal_date: admin.firestore.FieldValue.serverTimestamp(),
                                location: data.location,
                                images: data.images,
                                comments: data.comments,
                                shares: data.shares,
                                votes: data.votes,
                                hasBeenModified: data.hasBeenModified,
                                main_refusal_reason: computeRefusalReason(data).maxReason,
                                reasons_list: computeRefusalReason(data).reasonMap
                            })
                            .then((snapshot) => {
                                firestore
                                    .collection("refused_tasks")
                                    .doc(snapshot.id)
                                    .update({uid: snapshot.id})
                                    .then(() => console.log(`Indexing of ${data.uid} (${data.title}) done`))
                                    .catch((error) => console.error(error))
                            })
                    }
                })
        })
}

exports.newTasksTimeoutDispatcher = functions
    .pubsub.schedule("* * * * *")
    .onRun(() => {
        // Get all the documents in the collection
        firestore
            .collection("new_tasks")
            .get()
            .then((snapshot) => {
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    const submitDate = new Date(data.creation_date.seconds*1000)
                    const targetDate = new Date(submitDate.getTime() + 1000*(60*3))
                    const now = new Date(Date.now())
                    const diffTime = targetDate.getTime() - now.getTime()
                    if (Math.floor(diffTime/1000) < 60) {
                        manageTaskIndexing(doc)
                    }
                });
            });
        return null;
    });
