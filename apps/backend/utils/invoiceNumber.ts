import { Model } from 'mongoose';

/**
 * Generate unique invoice number
 * Format: INV-YYYYMM-XXXX
 */
export const generateInvoiceNumber = async (Invoice: Model<any>): Promise<string> => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `INV-${year}${month}`;

  // Find the last invoice for this month
  const lastInvoice = await Invoice.findOne({
    invoiceNumber: new RegExp(`^${prefix}-`),
  })
    .sort({ createdAt: -1 })
    .select('invoiceNumber');

  let sequence = 1;
  if (lastInvoice) {
    const lastSequence = parseInt(lastInvoice.invoiceNumber.split('-').pop() || '0');
    sequence = lastSequence + 1;
  }

  const invoiceNumber = `${prefix}-${String(sequence).padStart(4, '0')}`;
  return invoiceNumber;
};

/**
 * Generate unique ticket number
 * Format: TKT-YYYYMMDD-XXX
 */
export const generateTicketNumber = async (Ticket: Model<any>): Promise<string> => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const prefix = `TKT-${year}${month}${day}`;

  // Find the last ticket for this day
  const lastTicket = await Ticket.findOne({
    ticketNumber: new RegExp(`^${prefix}-`),
  })
    .sort({ createdAt: -1 })
    .select('ticketNumber');

  let sequence = 1;
  if (lastTicket) {
    const lastSequence = parseInt(lastTicket.ticketNumber.split('-').pop() || '0');
    sequence = lastSequence + 1;
  }

  const ticketNumber = `${prefix}-${String(sequence).padStart(3, '0')}`;
  return ticketNumber;
};

/**
 * Generate unique agent code
 * Format: AG-XXXX
 */
export const generateAgentCode = async (User: Model<any>): Promise<string> => {
  const prefix = 'AG';

  // Find the last agent
  const lastAgent = await User.findOne({
    agentCode: new RegExp(`^${prefix}-`),
  })
    .sort({ createdAt: -1 })
    .select('agentCode');

  let sequence = 1;
  if (lastAgent && lastAgent.agentCode) {
    const lastSequence = parseInt(lastAgent.agentCode.split('-').pop() || '0');
    sequence = lastSequence + 1;
  }

  const agentCode = `${prefix}-${String(sequence).padStart(4, '0')}`;
  return agentCode;
};

/**
 * Generate unique GEA code
 * Format: GEA-XXX
 */
export const generateGeaCode = async (User: Model<any>): Promise<string> => {
  const prefix = 'GEA';

  // Find the last GEA
  const lastGea = await User.findOne({
    geaCode: new RegExp(`^${prefix}-`),
  })
    .sort({ createdAt: -1 }) // Assuming sequential creation corresponds to sequential IDs/time
    .collation({ locale: 'en_US', numericOrdering: true }) // Ensure numeric sort if possible, or just rely on regex
    .select('geaCode');

  // If using collation, sort by geaCode might be better if createdAt is unreliable, but createdAt is usually fine.
  // Actually, string sort of "GEA-9" vs "GEA-10" is problematic without collation or parsing.
  // Using simple findOne with sort createdAt -1 usually finds the *latest created* one, which should have the highest code if generated sequentially.

  let sequence = 1;
  if (lastGea && lastGea.geaCode) {
    const parts = lastGea.geaCode.split('-');
    if (parts.length > 1) {
      const lastSequenceStr = parts.pop();
      const lastSequence = parseInt(lastSequenceStr || '0');
      if (!isNaN(lastSequence)) {
        sequence = lastSequence + 1;
      }
    }
  }

  const geaCode = `${prefix}-${String(sequence).padStart(3, '0')}`;
  return geaCode;
};

