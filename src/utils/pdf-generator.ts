import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const ROOM_DISPLAY_NAMES: Record<string, string> = {
  'Standard':     'Standard Room',
  'Premium':      'Premium Room',
  'Comfort Plus': 'Comfort Plus',
};

function getRoomTypeDisplayName(type: string): string {
  return ROOM_DISPLAY_NAMES[type] || type;
}

export async function generateInvoicePdf(booking: any, settings: any) {
  const pdfDoc = await PDFDocument.create();
  
  // A4 size: 595.28 x 841.89 points
  const width = 595.28;
  const height = 841.89;
  const page = pdfDoc.addPage([width, height]);
  
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  // Custom colors
  const primaryColor = rgb(26 / 255, 95 / 255, 74 / 255); // #1a5f4a
  const darkGray = rgb(34 / 255, 34 / 255, 34 / 255);
  const lightGray = rgb(100 / 255, 100 / 255, 100 / 255);
  const bgHeaderColor = rgb(244 / 255, 248 / 255, 246 / 255);
  const tableHeaderBg = rgb(26 / 255, 95 / 255, 74 / 255);
  const lineStroke = rgb(221 / 255, 221 / 255, 221 / 255);

  let y = 790; // Starting Y coordinate from top

  // 1. HEADER SECTION
  // Guest House Brand
  page.drawText(settings.guesthouse_name || 'Tulip Guest Rooms', {
    x: 40,
    y: y,
    size: 20,
    font: boldFont,
    color: primaryColor,
  });

  // Invoice details (Right aligned)
  const invoiceYear = new Date(booking.created_at || Date.now()).getFullYear();
  const invoiceNo = `INV-TGR-${invoiceYear}-${String(booking.id).padStart(4, '0')}`;
  const issuedDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  page.drawText(`Invoice No:`, { x: 380, y: y, size: 10, font: boldFont, color: darkGray });
  page.drawText(invoiceNo, { x: 460, y: y, size: 10, font, color: darkGray });
  
  page.drawText(`Booking Ref:`, { x: 380, y: y - 15, size: 10, font: boldFont, color: darkGray });
  page.drawText(booking.booking_reference || 'N/A', { x: 460, y: y - 15, size: 10, font, color: darkGray });

  page.drawText(`Issued Date:`, { x: 380, y: y - 30, size: 10, font: boldFont, color: darkGray });
  page.drawText(issuedDate, { x: 460, y: y - 30, size: 10, font, color: darkGray });

  page.drawText('Booking Invoice', {
    x: 40,
    y: y - 35,
    size: 16,
    font: boldFont,
    color: primaryColor,
  });

  y -= 50;

  // Thin separator line
  page.drawLine({
    start: { x: 40, y: y },
    end: { x: 555, y: y },
    thickness: 1.5,
    color: primaryColor,
  });

  y -= 25;

  // 2. GUEST DETAILS SECTION
  page.drawText('Guest Details', { x: 40, y: y, size: 12, font: boldFont, color: primaryColor });
  y -= 15;

  const drawRow = (label: string, value: string) => {
    // Draw row background
    page.drawRectangle({
      x: 40,
      y: y - 4,
      width: 515,
      height: 18,
      color: bgHeaderColor,
    });
    
    page.drawText(label, { x: 45, y: y, size: 9, font: boldFont, color: darkGray });
    page.drawText(value || '—', { x: 180, y: y, size: 9, font, color: darkGray });
    
    // Draw boundary box
    page.drawRectangle({
      x: 40,
      y: y - 4,
      width: 515,
      height: 18,
      borderColor: lineStroke,
      borderWidth: 0.5,
    });

    // Draw middle vertical line
    page.drawLine({
      start: { x: 170, y: y + 14 },
      end: { x: 170, y: y - 4 },
      thickness: 0.5,
      color: lineStroke,
    });

    y -= 18;
  };

  drawRow('Full Name', booking.guest_name);
  drawRow('Email', booking.guest_email);
  drawRow('Phone', booking.guest_phone);
  drawRow('CNIC / ID', booking.guest_cnic);
  drawRow('Address', booking.guest_address);
  if (booking.special_requests) {
    drawRow('Special Requests', booking.special_requests);
  }

  y -= 15;

  // 3. STAY DETAILS SECTION
  page.drawText('Stay Details', { x: 40, y: y, size: 12, font: boldFont, color: primaryColor });
  y -= 15;

  const checkIn = new Date(booking.check_in_date);
  const checkOut = new Date(booking.check_out_date);
  const diffTime = checkOut.getTime() - checkIn.getTime();
  const nights = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  drawRow('Room Number', booking.rooms?.room_number || booking.room_number || 'N/A');
  drawRow('Room Type', getRoomTypeDisplayName(booking.rooms?.room_type || booking.room_type || 'N/A'));
  drawRow('Check-In Date', booking.check_in_date);
  drawRow('Check-Out Date', booking.check_out_date);
  drawRow('Nights of Stay', `${nights} night${nights === 1 ? '' : 's'}`);
  drawRow('Guests Count', `${booking.guests_count} guest${booking.guests_count === 1 ? '' : 's'}`);

  y -= 15;

  // 4. CHARGES TABLE
  page.drawText('Charges', { x: 40, y: y, size: 12, font: boldFont, color: primaryColor });
  y -= 15;

  // Table header
  page.drawRectangle({
    x: 40,
    y: y - 4,
    width: 515,
    height: 20,
    color: tableHeaderBg,
  });

  const textOpts = { size: 9, font: boldFont, color: rgb(1, 1, 1) };
  page.drawText('Description', { x: 45, y: y, ...textOpts });
  page.drawText('Rate / Night', { x: 260, y: y, ...textOpts });
  page.drawText('Nights', { x: 370, y: y, ...textOpts });
  page.drawText('Amount', { x: 460, y: y, ...textOpts });

  y -= 20;

  // Table Row
  const formatMoney = (val: number) => `PKR ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const rate = Number(booking.rooms?.price_per_night || booking.price_per_night || 0);
  const totalVal = Number(booking.total_amount || 0);
  const roomNum = booking.rooms?.room_number || booking.room_number || 'N/A';
  const roomType = getRoomTypeDisplayName(booking.rooms?.room_type || booking.room_type || 'N/A');

  page.drawRectangle({
    x: 40,
    y: y - 4,
    width: 515,
    height: 22,
    borderColor: lineStroke,
    borderWidth: 0.5,
  });

  page.drawText(`Room ${roomNum} — ${roomType}`, { x: 45, y: y + 2, size: 9, font, color: darkGray });
  page.drawText(formatMoney(rate), { x: 260, y: y + 2, size: 9, font, color: darkGray });
  page.drawText(String(nights), { x: 370, y: y + 2, size: 9, font, color: darkGray });
  page.drawText(formatMoney(totalVal), { x: 460, y: y + 2, size: 9, font, color: darkGray });

  y -= 22;

  // Total Row
  page.drawRectangle({
    x: 40,
    y: y - 4,
    width: 515,
    height: 22,
    borderColor: lineStroke,
    borderWidth: 0.5,
    color: bgHeaderColor,
  });

  page.drawText('Total (PKR)', { x: 370, y: y + 2, size: 9, font: boldFont, color: darkGray });
  page.drawText(formatMoney(totalVal), { x: 460, y: y + 2, size: 9, font: boldFont, color: primaryColor });

  y -= 30;

  // 5. PAYMENT & STATUS SECTION
  page.drawText('Payment Info', { x: 40, y: y, size: 12, font: boldFont, color: primaryColor });
  y -= 15;

  const paymentLabelMap: Record<string, string> = {
    'jazzcash': 'JazzCash',
    'easypaisa': 'Easypaisa',
    'pay_at_hotel': 'Pay at Hotel',
    'walk_in': 'Walk-in',
  };
  const payMethod = paymentLabelMap[booking.payment_method] || booking.payment_method || 'N/A';

  drawRow('Payment Method', payMethod);
  drawRow('Payment Status', booking.payment_status);
  drawRow('Booking Status', booking.booking_status);

  // 6. FOOTER
  const footerY = 70;
  page.drawLine({
    start: { x: 40, y: footerY + 45 },
    end: { x: 555, y: footerY + 45 },
    thickness: 0.5,
    color: lineStroke,
  });

  const footerTextOpts = { size: 8, font, color: lightGray };
  page.drawText(settings.guesthouse_name || 'Tulip Guest Rooms', { x: 40, y: footerY + 30, size: 9, font: boldFont, color: primaryColor });
  page.drawText(settings.guesthouse_address || 'Karachi, Pakistan', { x: 40, y: footerY + 18, ...footerTextOpts });
  page.drawText(`Phone: ${settings.guesthouse_phone || '0300-1234567'}  |  Email: ${settings.guesthouse_email || 'hello@tulipguestrooms.com'}`, { x: 40, y: footerY + 6, ...footerTextOpts });
  
  const note = `Thank you for choosing ${settings.guesthouse_name || 'Tulip Guest Rooms'}.`;
  page.drawText(note, { x: 555 - font.widthOfTextAtSize(note, 8), y: footerY + 30, ...footerTextOpts });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
