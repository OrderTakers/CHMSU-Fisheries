// lib/email.ts
import nodemailer from 'nodemailer';

// Configure email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: EmailOptions) {
  try {
    // Verify transporter configuration
    await transporter.verify();

    const mailOptions = {
      from: `"Fisheries Lab System" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

// Email templates
export const emailTemplates = {
  guestRequestReceived: (data: {
    firstName: string;
    lastName: string;
    requestId: string;
    equipmentName: string;
    borrowDuration: string;
    purpose: string;
  }) => ({
    subject: 'Equipment Borrowing Request Received',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Equipment Borrowing Request Received</h2>
        <p>Dear ${data.firstName} ${data.lastName},</p>
        <p>Your request to borrow <strong>${data.equipmentName}</strong> has been received.</p>
        <p><strong>Request Details:</strong></p>
        <ul>
          <li>Request ID: ${data.requestId}</li>
          <li>Equipment: ${data.equipmentName}</li>
          <li>Borrow Duration: ${data.borrowDuration}</li>
          <li>Purpose: ${data.purpose}</li>
          <li>Status: Pending Approval</li>
        </ul>
        <p>You will receive another email once your request has been reviewed by our administrators.</p>
        <p>Thank you for using our equipment borrowing system.</p>
      </div>
    `,
  }),

  guestRequestApproved: (data: {
    firstName: string;
    lastName: string;
    requestId: string;
    equipmentName: string;
    borrowDuration: string;
    purpose: string;
    adminNotes?: string;
  }) => ({
    subject: 'Equipment Borrowing Request Approved',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Equipment Borrowing Request Approved</h2>
        <p>Dear ${data.firstName} ${data.lastName},</p>
        <p>Your request to borrow <strong>${data.equipmentName}</strong> has been <strong>APPROVED</strong>.</p>
        <p><strong>Request Details:</strong></p>
        <ul>
          <li>Request ID: ${data.requestId}</li>
          <li>Equipment: ${data.equipmentName}</li>
          <li>Borrow Duration: ${data.borrowDuration}</li>
          <li>Purpose: ${data.purpose}</li>
          <li>Status: <span style="color: green; font-weight: bold;">APPROVED</span></li>
        </ul>
        ${data.adminNotes ? `<p><strong>Admin Notes:</strong> ${data.adminNotes}</p>` : ''}
        <p>Please visit the laboratory during working hours to collect your equipment.</p>
        <p>Thank you for using our equipment borrowing system.</p>
      </div>
    `,
  }),

  guestRequestDeclined: (data: {
    firstName: string;
    lastName: string;
    requestId: string;
    equipmentName: string;
    borrowDuration: string;
    purpose: string;
    adminNotes?: string;
  }) => ({
    subject: 'Equipment Borrowing Request Declined',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Equipment Borrowing Request Declined</h2>
        <p>Dear ${data.firstName} ${data.lastName},</p>
        <p>Your request to borrow <strong>${data.equipmentName}</strong> has been <strong>DECLINED</strong>.</p>
        <p><strong>Request Details:</strong></p>
        <ul>
          <li>Request ID: ${data.requestId}</li>
          <li>Equipment: ${data.equipmentName}</li>
          <li>Borrow Duration: ${data.borrowDuration}</li>
          <li>Purpose: ${data.purpose}</li>
          <li>Status: <span style="color: red; font-weight: bold;">DECLINED</span></li>
        </ul>
        ${data.adminNotes ? `<p><strong>Reason:</strong> ${data.adminNotes}</p>` : ''}
        <p>If you have any questions, please contact the laboratory administrator.</p>
        <p>Thank you for using our equipment borrowing system.</p>
      </div>
    `,
  }),
};