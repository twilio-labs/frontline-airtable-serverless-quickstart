// Create global variable to memoize customer data
// so that we do not ping airtable for all customers every page load
const Airtable = require('airtable')

const initAirtable = (context) => {
  return new Airtable({ apiKey: context.AIRTABLE_API_KEY }).base(context.AIRTABLE_BASE_ID)
}

const getCustomers = async (context, selectOptions, returnRawRecord) => {
  selectOptions = selectOptions ?? {
    view: 'Grid view',
    pageSize: 100
  }

  return new Promise((resolve, reject) => {
    const customers = []
    const base = initAirtable(context)
    base('Customers').select(selectOptions).eachPage(function page (records, fetchNextPage) {
      // This function (`page`) will get called for each page of records
      records.forEach(function (record) {
        const customer = returnRawRecord ? record : toCustomerDto(record)
        customers.push(customer)
      })
      fetchNextPage()
    }, function done (err) {
      if (err) {
        reject(JSON.stringify(err))
      }
      resolve(customers)
    })
  })
}

const getCustomer = async (context, filter, returnRawRecord = false) => {
  const customerQuery = {
    view: 'Grid view',
    filterByFormula: `{${filter.key}} = '${filter.value}'`,
    maxRecords: 1
  }

  const customer = (await getCustomers(context, customerQuery, returnRawRecord))[0]

  return customer
}

const getCustomersByWorker = async (context, worker, pageSize, anchor) => {
  const workerQuery = {
    view: 'Grid view',
    pageSize: 100,
    filterByFormula: `{owner} = '${worker}'`
  }

  const customers = await getCustomers(context, workerQuery)
  const customersView = customers.map(customer => ({
    display_name: customer.display_name,
    customer_id: customer.customer_id,
    avatar: customer.avatar
  }))

  if (!pageSize) {
    return customersView
  }

  if (anchor) {
    const lastIndex = customersView.findIndex((c) => String(c.customer_id) === String(anchor))
    const nextIndex = lastIndex + 1
    return customersView.slice(nextIndex, nextIndex + pageSize)
  } else {
    return customersView.slice(0, pageSize)
  }
}

const getRandomWorker = async (context) => {
  const allCustomers = getCustomers(context)
  const uniqueWorkers = []

  for (const customer of allCustomers) {
    if (!uniqueWorkers.includes(customer.worker)) {
      uniqueWorkers.push(customer.worker)
    }
  }

  const randomIndex = Math.floor(Math.random() * uniqueWorkers.length)
  return uniqueWorkers[randomIndex]
}

const toCustomerDto = (customerRecord) => {
  try {
    let optOutStatus
    switch (customerRecord.get('opt_out')) {
      case 'true':
        optOutStatus = 'OPTED OUT'
        break
      case 'false':
        optOutStatus = 'SUBSCRIBED'
        break
      default:
        optOutStatus = 'NOT SET'
    }

    const customerDto = {
      customer_id: `${customerRecord.get('id')}`,
      display_name: `${customerRecord.get('name')}`,
      channels: [
        { type: 'sms', value: `${customerRecord.get('sms')}` },
        { type: 'whatsapp', value: `${customerRecord.get('whatsapp')}` }
      ],
      links: [
        { type: 'LinkedIn', value: `${customerRecord.get('linkedin')}`, display_name: 'Social Media Profile' },
        { type: 'Email', value: `mailto:${customerRecord.get('email')}`, display_name: 'Email Address' }
      ],
      details: {
        title: 'Information',
        content: `Notes: ${customerRecord.get('notes')}\nOpt Out Status: ${optOutStatus}`
      },
      worker: `${customerRecord.get('owner')}`,
      address: `${(customerRecord.get('sms') ?? 'none').replace(/[-()]/gm, '')}`
    }

    return customerDto
  } catch (err) {
    return new Error(err)
  }
}

const toCustomerFields = (customerDto) => {
  const smsChannel = customerDto.channels && customerDto.channels.find(c => c.type === 'sms')
  const waChannel = customerDto.channels && customerDto.channels.find(c => c.type === 'whatsapp')

  return {
    name: customerDto.display_name,
    sms: smsChannel ? smsChannel.value : null,
    whatsapp: waChannel ? waChannel.value : null,
    owner: customerDto.worker
  }
}

const createCustomer = async (context, customerDto) => {
  const fields = toCustomerFields(customerDto)
  const base = initAirtable(context)
  return new Promise((resolve, reject) => {
    base('Customers').create(fields, function done (err, record) {
      if (err) {
        console.error('createCustomer error: ' + JSON.stringify(err))
        reject(err)
      }

      const newCustomerDto = toCustomerDto(record)
      resolve(newCustomerDto)
    })
  })
}

const deleteCustomer = async (context, rawId) => {
  const base = initAirtable(context)
  return new Promise((resolve, reject) => {
    base('Customers').destroy([rawId], function done (err, deletedRecords) {
      if (err) {
        console.error('deleteCustomer error: ' + JSON.stringify(err))
        reject(err)
      }
      resolve(deletedRecords)
    })
  })
}

const updateCustomer = async (context, rawId, fields) => {
  const base = initAirtable(context)
  return new Promise((resolve, reject) => {
    base('Customers').update(rawId, fields, function done (err, record) {
      if (err) {
        console.error('updateCustomer error: ' + JSON.stringify(err))
        reject(err)
      }
      resolve(record)
    })
  })
}

module.exports = {
  createCustomer,
  deleteCustomer,
  getCustomer,
  getCustomersByWorker,
  getRandomWorker,
  updateCustomer
}
