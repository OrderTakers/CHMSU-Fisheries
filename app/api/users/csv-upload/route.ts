// api/users/csv-upload/route.ts
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

// Email transporter configuration
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

// Generate secure 8-character password (letters and numbers only)
const generateSecurePassword = (): string => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  
  // Ensure at least one character from each category
  let password = '';
  password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
  password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
  password += numbers.charAt(Math.floor(Math.random() * numbers.length));
  
  // Fill remaining 5 characters with any combination of letters and numbers
  const allChars = uppercase + lowercase + numbers;
  for (let i = 0; i < 5; i++) {
    password += allChars.charAt(Math.floor(Math.random() * allChars.length));
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

// Send welcome email with credentials
async function sendWelcomeEmail(email: string, userData: any, password: string) {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email.trim().toLowerCase(),
      subject: 'Welcome to CHMSU Fisheries System - Your Account Details',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to CHMSU Fisheries System</title>
            <style>
                body { 
                    font-family: 'Arial', sans-serif; 
                    background-color: #f8fafc;
                    margin: 0;
                    padding: 20px;
                    line-height: 1.6;
                }
                .container {
                    max-width: 600px;
                    margin: 0 auto;
                    background: white;
                    padding: 40px;
                    border-radius: 12px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    border: 1px solid #e2e8f0;
                }
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                    padding-bottom: 20px;
                    border-bottom: 2px solid #16a34a;
                }
                .system-name {
                    color: #16a34a;
                    font-size: 24px;
                    font-weight: bold;
                    margin: 15px 0 5px 0;
                }
                .subtitle {
                    color: #64748b;
                    font-size: 16px;
                    margin-bottom: 10px;
                }
                .content {
                    background: #f8fafc;
                    padding: 25px;
                    border-radius: 8px;
                    margin: 20px 0;
                }
                .credentials {
                    background: #e8f5e8;
                    border: 1px solid #16a34a;
                    border-radius: 8px;
                    padding: 20px;
                    margin: 20px 0;
                }
                .password-box {
                    background: #1e293b;
                    color: #f1f5f9;
                    padding: 15px;
                    border-radius: 6px;
                    font-family: 'Courier New', monospace;
                    font-size: 18px;
                    text-align: center;
                    margin: 15px 0;
                    letter-spacing: 1px;
                }
                .warning {
                    background: #fef3c7;
                    border: 1px solid #f59e0b;
                    color: #92400e;
                    padding: 15px;
                    border-radius: 8px;
                    margin: 20px 0;
                    font-size: 14px;
                }
                .instructions {
                    color: #475569;
                    font-size: 14px;
                    text-align: center;
                    margin: 20px 0;
                }
                .footer {
                    text-align: center;
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #e2e8f0;
                    color: #64748b;
                    font-size: 12px;
                }
                .contact-info {
                    margin-top: 10px;
                    font-size: 11px;
                }
                @media (max-width: 600px) {
                    .container {
                        padding: 20px;
                    }
                    .password-box {
                        font-size: 16px;
                        padding: 12px;
                    }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="system-name">CHMSU Fisheries System</div>
                    <div class="subtitle">Your Account Has Been Created</div>
                </div>
                
                <div class="content">
                    <p style="color: #334155; margin-bottom: 15px;">Hello ${userData.firstName} ${userData.lastName},</p>
                    <p style="color: #475569;">An administrator has created an account for you in the <strong>CHMSU Fisheries System</strong>. Below are your login credentials:</p>
                    
                    <div class="credentials">
                        <p style="color: #334155; margin-bottom: 10px;"><strong>Account Details:</strong></p>
                        <p style="color: #475569; margin: 5px 0;"><strong>Name:</strong> ${userData.firstName} ${userData.lastName}</p>
                        <p style="color: #475569; margin: 5px 0;"><strong>Email:</strong> ${userData.email}</p>
                        <p style="color: #475569; margin: 5px 0;"><strong>School ID:</strong> ${userData.schoolID}</p>
                        <p style="color: #475569; margin: 5px 0;"><strong>Role:</strong> ${userData.role}</p>
                        ${userData.role === 'student' ? `<p style="color: #475569; margin: 5px 0;"><strong>Year & Section:</strong> ${userData.schoolYear} - ${userData.section}</p>` : ''}
                        
                        <div style="margin: 20px 0;">
                            <p style="color: #334155; margin-bottom: 10px;"><strong>Your Auto-Generated Password:</strong></p>
                            <div class="password-box">${password}</div>
                        </div>
                    </div>
                    
                    <div class="instructions">
                        Please log in to the system using your School ID and the password above.
                    </div>
                    
                    <div class="warning">
                        <strong>Important Security Notice:</strong><br>
                        • This is an auto-generated password<br>
                        • Change your password after first login<br>
                        • Do not share your credentials with anyone<br>
                        • Keep your password secure and confidential
                    </div>
                    
                    <p style="color: #475569; margin-top: 20px;">
                        You can access the system at: <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}" style="color: #16a34a;">${process.env.NEXTAUTH_URL || 'http://localhost:3000'}</a>
                    </p>
                    
                    <p style="color: #475569;">
                        If you have any questions or need assistance, please contact the system administrator.
                    </p>
                </div>
                
                <div class="footer">
                    <p>&copy; ${new Date().getFullYear()} CHMSU Fisheries System. All rights reserved.</p>
                    <div class="contact-info">
                        This is an automated message. Please do not reply to this email.
                    </div>
                </div>
            </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log("✅ Welcome email sent successfully to:", email);
    return true;
  } catch (error) {
    console.error("❌ Welcome email sending error:", error);
    throw new Error("Failed to send welcome email");
  }
}

// MongoDB connection utility
async function connectToDatabase() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri || typeof mongoUri !== "string") {
    throw new Error("MongoDB connection string not configured");
  }

  if (mongoose.connection.readyState === 0) {
    try {
      await mongoose.connect(mongoUri, { bufferCommands: false });
      console.log("✅ Connected to MongoDB");
    } catch (error) {
      console.error("❌ MongoDB connection error:", error);
      throw error;
    }
  }
}

// CSV Parser function (simple implementation without csv-parse)
function parseCSV(csvText: string): any[] {
  const lines = csvText.split('\n').filter(line => line.trim() !== '');
  if (lines.length < 2) {
    throw new Error("CSV file must have at least a header and one data row");
  }

  const headers = lines[0].split(',').map(header => header.trim());
  
  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(value => value.trim());
    const record: any = {};
    
    for (let j = 0; j < headers.length; j++) {
      record[headers[j]] = values[j] || '';
    }
    
    records.push(record);
  }
  
  return records;
}

// Validate CSV data
function validateCSVData(record: any, index: number): string[] {
  const errors: string[] = [];

  if (!record.schoolID?.trim()) {
    errors.push(`Row ${index + 1}: School ID is required`);
  }

  if (!record.firstName?.trim()) {
    errors.push(`Row ${index + 1}: First Name is required`);
  }

  if (!record.lastName?.trim()) {
    errors.push(`Row ${index + 1}: Last Name is required`);
  }

  if (!record.email?.trim()) {
    errors.push(`Row ${index + 1}: Email is required`);
  } else if (!record.email.includes('@')) {
    errors.push(`Row ${index + 1}: Invalid email format`);
  }

  if (!record.role?.trim()) {
    errors.push(`Row ${index + 1}: Role is required`);
  } else if (!['admin', 'student', 'faculty'].includes(record.role.toLowerCase())) {
    errors.push(`Row ${index + 1}: Role must be one of: admin, student, faculty`);
  }

  if (record.role?.toLowerCase() === 'student') {
    if (!record.schoolYear?.trim()) {
      errors.push(`Row ${index + 1}: School Year is required for students`);
    }
    if (!record.section?.trim()) {
      errors.push(`Row ${index + 1}: Section is required for students`);
    }
  }

  return errors;
}

export async function POST(req: Request) {
  try {
    await connectToDatabase();

    const formData = await req.formData();
    const csvFile = formData.get('csvFile') as File;

    if (!csvFile) {
      return NextResponse.json({ error: "CSV file is required" }, { status: 400 });
    }

    // Read and parse CSV file
    const csvText = await csvFile.text();
    const records = parseCSV(csvText);

    if (records.length === 0) {
      return NextResponse.json({ error: "CSV file is empty" }, { status: 400 });
    }

    console.log(`📊 Processing ${records.length} records from CSV`);

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each record
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      
      // Validate record
      const validationErrors = validateCSVData(record, i);
      if (validationErrors.length > 0) {
        results.failed++;
        results.errors.push(...validationErrors);
        continue;
      }

      const userData = {
        schoolID: record.schoolID.trim(),
        firstName: record.firstName.trim(),
        lastName: record.lastName.trim(),
        email: record.email.trim().toLowerCase(),
        role: record.role.toLowerCase() as "admin" | "student" | "faculty",
        schoolYear: record.role.toLowerCase() === 'student' ? record.schoolYear?.trim() : "",
        section: record.role.toLowerCase() === 'student' ? record.section?.trim() : "",
      };

      try {
        // Check if user already exists
        const existingUser = await User.findOne({
          $or: [
            { email: userData.email },
            { schoolID: userData.schoolID }
          ]
        });

        if (existingUser) {
          results.failed++;
          results.errors.push(`Row ${i + 1}: User with email ${userData.email} or School ID ${userData.schoolID} already exists`);
          continue;
        }

        // Generate 8-character password (letters and numbers only) and create user
        const password = generateSecurePassword();
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log(`🔑 Generated 8-character password for ${userData.email}:`, password);

        const newUserData: any = {
          ...userData,
          password: hashedPassword,
          status: "active",
          emailVerified: true,
          loginCount: 0,
          lastLogin: null,
        };

        // Create and save user
        const newUser = new User(newUserData);
        await newUser.save();

        // Send welcome email
        try {
          await sendWelcomeEmail(userData.email, userData, password);
          console.log(`✅ User created and email sent: ${userData.email}`);
        } catch (emailError) {
          console.error(`❌ Failed to send email for ${userData.email}:`, emailError);
          // Continue even if email fails - user is still created
        }

        results.success++;
      } catch (error: any) {
        console.error(`❌ Error creating user ${userData.email}:`, error);
        results.failed++;
        results.errors.push(`Row ${i + 1}: Failed to create user - ${error.message}`);
      }
    }

    console.log(`📈 CSV processing completed: ${results.success} successful, ${results.failed} failed`);

    return NextResponse.json(results, { status: 200 });

  } catch (error: any) {
    console.error("❌ CSV upload error:", error);
    return NextResponse.json({ 
      error: "Failed to process CSV file: " + error.message 
    }, { status: 500 });
  }
}