export const canAccessInstructorArea=profile=>profile?.status==="active"&&["manager","instructor"].includes(profile?.role);
export const canViewAdaptations=profile=>canAccessInstructorArea(profile)&&(profile.role==="manager"||profile.can_view_health===true);

