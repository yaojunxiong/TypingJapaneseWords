export function sendMembershipApprovalEmailMock(params: {
  requestId: string
  userId: string
  requestedLevel: string
}): { approvalLink: string; messageId: string } {
  const approvalLink = `/admin/membership-requests?requestId=${encodeURIComponent(params.requestId)}`
  const messageId = `mock-membership-${params.requestId}`
  return { approvalLink, messageId }
}
