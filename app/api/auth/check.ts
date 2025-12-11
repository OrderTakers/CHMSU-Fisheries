// pages/api/auth/check.ts
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authToken = req.cookies.auth_token;
  if (!authToken) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  // Verify token with your auth system (e.g., JWT, database check)
  try {
    // Example: Verify JWT or check session
    const user = { id: "123", role: "admin" }; // Replace with actual user data
    return res.status(200).json({ user });
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
}