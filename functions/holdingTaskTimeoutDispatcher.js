const functions = require("firebase-functions");
const admin = require(`${__dirname}/firebase`)

const HOURS_THRESHOLD = 24 // in hours
const firestore = admin.firestore();


const computeThresholdByTaskDifficulty = (difficulty) => {
    switch (Number(difficulty)) {
        case 1:
            return 12
        case 2:
            return 36
        case 3:
            return 4*24
        case 4:
            return 7*24
        case 5:
            return 14*24
        default:
            return
    }
}

function manageHoldingTaskIndexing (data, diffTime) {

    const taskRelUsers = []
    taskRelUsers.push(data.chooser)
    if (data.side_choosers) {
        data.side_choosers.map((sc) => {
            taskRelUsers.push(sc)
        })
    }
    console.log("--------------------------------------------------")
    console.log("Diff time: ", Math.floor(diffTime/1000))
    console.log("One week: ", 3600*24*7)
    console.log("--------------------------------------------------")

    if (Math.floor(diffTime/1000) >= 3600*24*7) {
        firestore
            .collection("available_tasks")
            .doc(data.uid)
            .delete()
            .then(() => {
                taskRelUsers.map((relUser) => {
                    firestore
                        .collection("taskers")
                        .doc(relUser)
                        .update({
                            ongoing_task: null
                        })
                })
            })

    } else {
        firestore
            .collection("available_tasks")
            .doc(data.uid)
            .update({
                chooser: null,
                side_choosers: null,
                choosing_date: null
            })
            .then(() => {
                taskRelUsers.map((relUser) => {
                    firestore
                        .collection("taskers")
                        .doc(relUser)
                        .update({
                            ongoing_task: null
                        })
                })
            })
            .then(() => {
                taskRelUsers.map((relUser) => {
                    firestore
                        .collection("available_tasks")
                        .doc(data.uid)
                        .update({
                            blacklist: admin.firestore.FieldValue.arrayUnion(relUser)
                        })
                })
            })
    }
}

exports.holdingTaskTimeoutDispatcher = functions
    .pubsub.schedule("* * * * *")
    .onRun(() => {
        // Get all the documents in the collection
        firestore
            .collection("available_tasks")
            .get()
            .then((snapshot) => {
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    const submitDate = new Date(data?.choosing_date?.seconds*1000)
                    const targetDate = new Date(submitDate.getTime() + 1000*(3600*computeThresholdByTaskDifficulty(data.difficulty)))
                    const now = new Date(Date.now())
                    const diffTime = targetDate.getTime() - now.getTime()

                    const query = firestore.collection("before_after").where("original_task", "==", data.uid)
                    query.get().then((querySnapshot) => {
                        if ((Math.floor(diffTime/1000) < 60) && data.chooser && querySnapshot.empty && (data.chooser !== "deleted")) {
                            manageHoldingTaskIndexing(data, diffTime)
                        }
                    })
                });
            });
        return null;
    })