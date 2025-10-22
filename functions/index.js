const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { onDocumentWritten } = require('firebase-functions/v2/firestore');

initializeApp();
const db = getFirestore();

const REGION = 'australia-southeast1';

function isActive(status) {
  return status === 'registered' || status === 'confirmed' || status === 'approved';
}

exports.syncRegistrationCount = onDocumentWritten(
  { region: REGION, document: 'activities/{aid}/registrations/{uid}' },
  async (event) => {
    const aid = event.params.aid;
    const before = event.data.before.exists ? event.data.before.data() : null;
    const after  = event.data.after.exists  ? event.data.after.data()  : null;

    const beforeActive = before ? isActive(before.status) : false;
    const afterActive  = after  ? isActive(after.status) : false;

    let delta = 0;
    if (!before && afterActive) delta = 1;
    else if (!after && beforeActive) delta = -1;
    else if (beforeActive !== afterActive) delta = afterActive ? 1 : -1;

    if (delta !== 0) {
      console.log(`Activity ${aid}: reservedCount increment ${delta}`);
      await db
        .collection('activities')
        .doc(aid)
        .set({ reservedCount: FieldValue.increment(delta) }, { merge: true });
    }
  }
);

exports.updateAverageRating = onDocumentWritten(
  { region: REGION, document: 'reviews/{reviewId}' },
  async (event) => {
    const data = event.data.after.data() || event.data.before.data();
    if (!data) return null;

    const aid = data.activityId;
    if (!aid) return null;

    const activityRef = db.doc(`activities/${aid}`);

    try {
      const reviewsSnap = await db
        .collection('reviews')
        .where('activityId', '==', aid)
        .get();

      const reviews = reviewsSnap.docs;
      const reviewCount = reviews.length;

      let avgRating = 0;
      if (reviewCount > 0) {
        const totalRating = reviews.reduce((acc, doc) => {
          return acc + (doc.data().rating || 0);
        }, 0);
        avgRating = totalRating / reviewCount;
      }

      return activityRef.set(
        {
          avgRating: avgRating,
          reviewCount: reviewCount
        },
        { merge: true }
      );
    } catch (e) {
      console.error(`Error updating avgRating for activity ${aid}`, e);
      return null;
    }
  }
);
