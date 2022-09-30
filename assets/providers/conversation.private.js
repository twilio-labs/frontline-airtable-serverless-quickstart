const getParticipant = async (context, conversationSid, participantSid) => {
  return await context.getTwilioClient().conversations
    .conversations(conversationSid)
    .participants.get(participantSid)
    .fetch()
}

const getPhoneNumber = (address) => {
  return address.slice(
    address.indexOf(':') + 1,
    address.length
  )
}

module.exports = {
  getParticipant, getPhoneNumber
}
