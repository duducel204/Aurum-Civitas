/** RM8 / AC7: authorization on stable principals; authentication provider is injected. */
export const semanticId = "RM8";
export type Principal = { id: string; verified: boolean };
export type Membership = {
  actorId: string;
  cityId: string;
  role: "member" | "owner";
  regionId: string;
};
export function authorize(
  principal: Principal,
  cityId: string,
  memberships: Membership[],
  ownerOnly = false,
): boolean {
  return (
    principal.verified === true &&
    !!principal.id &&
    memberships.some(
      (m) =>
        m.actorId === principal.id &&
        m.cityId === cityId &&
        (!ownerOnly || m.role === "owner"),
    )
  );
}
export function bindMembership(
  previous: Membership[],
  principal: Principal,
  entry: Membership,
): Membership[] {
  if (
    !entry.actorId ||
    !entry.cityId ||
    !entry.regionId ||
    !["member", "owner"].includes(entry.role) ||
    !authorize(principal, entry.cityId, previous, true)
  )
    throw Error("RM8: membership change denied");
  return [
    ...previous.filter(
      (m) => !(m.actorId === entry.actorId && m.cityId === entry.cityId),
    ),
    { ...entry },
  ];
}
