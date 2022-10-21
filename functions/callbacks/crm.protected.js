// eslint-disable-next-line no-undef
const customersPath = Runtime.getAssets()['/providers/customers.js'].path
const { createCustomer, getCustomerById, getCustomersList } = require(customersPath)

exports.handler = async function (context, event, callback) {
  const location = event.Location
  let response

  // Location helps to determine which information was requested.
  // CRM callback is a general purpose tool and might be used to fetch different kind of information
  try {
    switch (location) {
      case 'CreateCustomer': {
        response = await handleCreateCustomer(context, event)
        break
      }
      case 'GetCustomerDetailsByCustomerId': {
        response = await handleGetCustomerDetailsByCustomerIdCallback(context, event)
        break
      }
      case 'GetCustomersList': {
        response = await handleGetCustomersListCallback(context, event)
        break
      }
      default: {
        console.log('crm.handler - Unknown location: ', location)
        throw new Error(`422 Unknown location: ${location}`)
      }
    }
    callback(null, response)
  } catch (err) {
    console.log(`crm.handler error: ${err}`)
    callback(new Error(err))
  }
}

const handleCreateCustomer = async (context, event) => {
  const customerRequest = event.Customer
  customerRequest.worker = event.Worker
  const newCustomer = await createCustomer(context, customerRequest)

  // Respond with Contact object
  return {
    objects: {
      customer: {
        customer_id: newCustomer.customer_id,
        display_name: newCustomer.display_name,
        channels: newCustomer.channels,
        links: newCustomer.links,
        avatar: newCustomer.avatar,
        details: newCustomer.details
      }
    }
  }
}

const handleGetCustomerDetailsByCustomerIdCallback = async (context, event) => {
  const customerId = event.CustomerId

  // Fetch Customer Details based on his ID
  // and information about a worker, that requested that information
  const customerDetails = await getCustomerById(context, customerId)

  // Respond with Contact object
  return {
    objects: {
      customer: {
        customer_id: customerDetails.customer_id,
        display_name: customerDetails.display_name,
        channels: customerDetails.channels,
        links: customerDetails.links,
        avatar: customerDetails.avatar,
        details: customerDetails.details
      }
    }
  }
}

const handleGetCustomersListCallback = async (context, event) => {
  console.log('Getting customers list.')

  const workerIdentity = event.Worker
  const pageSize = event.PageSize
  const anchor = event.Anchor || 0

  // Fetch Customers list based on information about a worker, that requested it
  const customersList = await getCustomersList(context, workerIdentity, pageSize, anchor)

  // Respond with Customers object
  return {
    objects: {
      customers: customersList
    }
  }
}
