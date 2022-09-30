require('dotenv').config()
const express = require('express')
const { v1: uuidv1 } = require('uuid')
const { updateCustomer } = require('./assets/providers/customers.private')
const _ = (varName, defaults) => process.env[varName] || defaults || null
const port = _('PORT', 5001)

const config = {
  port: port,
  airtable: {
    api_key: _('AIRTABLE_API_KEY'),
    base_id: _('AIRTABLE_BASE_ID')
  }
}

const createApp = (config) => {
  const app = express()

  const requestFilter = (req, res, next) => {
    res.locals.log = logWithRequestData(req.method, req.path, uuidv1())
    next()
  }

  const logWithRequestData = (method, path, id) => (...message) => {
    console.log(`[${method}][${path}][${id}]`, ...message)
  }

  app.enable('trust proxy') // for trusting heroku proxy
  app.use(express.json())
  app.use(express.urlencoded())
  app.use(requestFilter)

  app.post('/airtable/update/test', airtTableUpdateHandler)

  return app
}

const airtTableUpdateHandler = async (req, res) => {
  try {
    const context = { AIRTABLE_API_KEY: config.airtable.api_key, AIRTABLE_BASE_ID: config.airtable.base_id }
    await updateCustomer(context, 1, {
      opt_out: 'some opt out info' // { [_('TWILIO_SMS_NUMBER')]: true }
    })
    res.status(200).send({ api_key: config.airtable.api_key })
  } catch (err) {
    console.log('airtTableUpdateHandler error:' + err)
    res.status(500).send({ error: err })
  }
}

const app = createApp(config)
app.listen(config.port, () => {
  console.info(`Application started at ${config.port}`)
})
