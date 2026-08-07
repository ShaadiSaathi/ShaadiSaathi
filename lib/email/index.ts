export {
  EMAIL_NOT_CONFIGURED_MESSAGE,
  getEmailFromAddress,
  isEmailConfigured,
  normalizeEmail,
} from "./config"
export { sendEmail, type SendEmailResult } from "./send"
export {
  emailDisputeParties,
  getUserEmail,
  getVendorOwnerEmail,
  getWeddingOwnerEmail,
  sendBookingConfirmationEmail,
  sendDisputeOutcomeEmail,
  sendPaymentReceiptEmail,
} from "./transactional"
