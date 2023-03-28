const functions = require("firebase-functions");
const admin = require(`${__dirname}/firebase`)

const HOURS_THRESHOLD = 24 // in hours
const firestore = admin.firestore();


exports.availableTasksDeletionDispatcher = functions
    .pubsub.schedule("* * * * *")
    .onRun(() => {
        // Get all the documents in the collection
        firestore
            .collection("available_tasks")
            .get()
            .then((snapshot) => {
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    const submitDate = new Date(data?.creation_date?.seconds*1000)
                    const targetDate = new Date(submitDate.getTime() + 1000*3600*24*7)
                    const now = new Date(Date.now())
                    const diffTime = targetDate.getTime() - now.getTime()

                    if ((Math.floor(diffTime/1000) < 60) && !data.chooser) {
                        firestore
                            .collection("available_tasks")
                            .doc(data.uid)
                            .update({
                                chooser: "deleted"
                            })
                    }
                });
            });
        return null;
    })