import { getFirebaseServices } from '../firebase/firebase.js';

export const storagePaths = Object.freeze({
  profilePhoto: (uid) => `v5/users/${uid}/profile`,
  profileBanner: (uid) => `v5/users/${uid}/banner`,
  campaignImage: (campaignId) => `v5/campaigns/${campaignId}/cover`,
  compendiumImage: (campaignId, resourceId) => `v5/campaigns/${campaignId}/compendium/${resourceId}`,
});

export async function createStorageReference(path) {
  const { storage, sdk: { storageSdk } } = await getFirebaseServices();
  return storageSdk.ref(storage, path);
}
