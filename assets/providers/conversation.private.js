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

const isUserMessageEvent = (event) => {
  return !!event.ClientIdentity
}

module.exports = {
  getParticipant, getPhoneNumber, isUserMessageEvent
}
