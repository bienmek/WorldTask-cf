const functions = require("firebase-functions");
const admin = require(`${__dirname}/firebase`)

const HOURS_THRESHOLD = 24 // in hours
const firestore = admin.firestore();

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

function manageBeforeAfterIndexing(data) {
    const BARelUsers = []
    BARelUsers.push(data.creator)
    if (data.side_creators) {
        data.side_creators.map((sc) => {
            BARelUsers.push(sc)
        })
    }
    if (computeVotePercentage(data).yes > 50) {
        BARelUsers.map((relUser) => {
            firestore
                .collection("taskers")
                .doc(relUser)
                .update({
                    stars: admin.firestore.FieldValue.increment(Math.floor(data.reward/BARelUsers.length)),
                    before_afters: admin.firestore.FieldValue.arrayUnion(data.uid),
                    ongoing_task: null
                })
                .catch((error) => console.error(error))
        })
        firestore
            .collection("before_after")
            .doc(data.uid)
            .update({
                isValidated: true,
                comments: [],
                shares: [],
                votes: [],
                creation_date: admin.firestore.FieldValue.serverTimestamp()
            })
            .catch((error) => console.error(error))
    } else {
        BARelUsers.map((relUser) => {
            firestore
                .collection("taskers")
                .doc(relUser)
                .update({
                    ongoing_task: null,
                    failed_before_afters: admin.firestore.FieldValue.increment(1)
                })
                .catch((error) => console.error(error))
        })
        firestore
            .collection("before_after")
            .doc(data.uid)
            .delete()
            .then(() => {
                firestore
                    .collection("available_tasks")
                    .doc(data.original_task)
                    .update({
                        chooser: null,
                        creation_date: admin.firestore.FieldValue.serverTimestamp(),
                        side_choosers: null
                    })
                    .then(() => {
                        BARelUsers.map((relUser) => {
                            firestore
                                .collection("available_tasks")
                                .doc(data.original_task)
                                .update({
                                    blacklist: admin.firestore.FieldValue.arrayUnion(relUser)
                                })
                                .catch((error) => console.error(error))
                        })
                    })
            })
            .catch((error) => console.error(error))
    }
}

exports.beforeAftersTimeoutDispatcher = functions
    .pubsub.schedule("* * * * *")
    .onRun(() => {
        // Get all the documents in the collection
        firestore
            .collection("before_after")
            .get()
            .then((snapshot) => {
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    const submitDate = new Date(data.creation_date.seconds*1000)
                    const targetDate = new Date(submitDate.getTime() + 1000*(60*3))
                    const now = new Date(Date.now())
                    const diffTime = targetDate.getTime() - now.getTime()
                    if ((Math.floor(diffTime/1000) < 60) && !data.isValidated) {
                        manageBeforeAfterIndexing(data)
                    }
                });
            });
        return null;
    });