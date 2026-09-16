
const items = [{ snapshotData: { activityId: 'abc' } }];
const updates = { snapshotData: { ...items[0].snapshotData, activityId: undefined } };
const clone = [...items];
clone[0] = { ...clone[0], ...updates };

console.log('activityId:', clone[0].snapshotData.activityId);
console.log('!!activityId:', !!clone[0].snapshotData.activityId);

