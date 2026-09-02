export const campaignRoles = Object.freeze({ OWNER: 'OWNER', MASTER: 'MASTER', PLAYER: 'PLAYER' });

const permissionsByRole = Object.freeze({
  OWNER: ['campaign:access', 'campaign:manage'],
  MASTER: ['campaign:access', 'campaign:master'],
  PLAYER: ['campaign:access'],
});

export function hasPermission(role, permission) { return permissionsByRole[role]?.includes(permission) ?? false; }
export function isCampaignOwner(membership) { return membership?.role === campaignRoles.OWNER; }
export function isCampaignMaster(membership) { return membership?.role === campaignRoles.MASTER || isCampaignOwner(membership); }
export function isCampaignPlayer(membership) { return membership?.role === campaignRoles.PLAYER || isCampaignMaster(membership); }
export function canAccessCampaign(membership) { return isCampaignPlayer(membership); }
