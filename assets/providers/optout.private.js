const getOptOutChangeRequest = (messageBody) => {
  const optInKeywords = ['START', 'STAHT']
  const optOutKeywords = ['STOP', 'STAHP', 'IQUIT']
  if (!messageBody) return null
  if (optInKeywords.includes(messageBody.toUpperCase())) return 'false'
  if (optOutKeywords.includes(messageBody.toUpperCase())) return 'true'

  return null
}

const isOptedOut = (customerRecord) => {
  return customerRecord.get('opt_out') === 'true'
}

module.exports = {
  getOptOutChangeRequest, isOptedOut
}
