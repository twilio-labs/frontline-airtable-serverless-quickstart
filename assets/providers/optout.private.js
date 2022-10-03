const getOptOutChangeRequest = (messageBody) => {
  const optInKeywords = ['START', 'STAHT']
  const optOutKeywords = ['STOP', 'STAHP', 'IQUIT']
  if (!messageBody) return null
  if (optInKeywords.includes(messageBody.toUpperCase())) return 'FALSE'
  if (optOutKeywords.includes(messageBody.toUpperCase())) return 'TRUE'
  return null
}

module.exports = {
  getOptOutChangeRequest
}
