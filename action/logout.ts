"use server";

import { cookies } from "next/headers";

export async function logout() {
  try {
    const cookieStore = await cookies();
    
    // Delete all authentication cookies
    const authCookies = ["auth_token", "token", "session", "userToken", "currentUserId"];
    
    authCookies.forEach(cookieName => {
      if (cookieStore.has(cookieName)) {
        cookieStore.delete(cookieName);
        console.log(`✅ Deleted ${cookieName} cookie`);
      }
    });

    console.log("✅ Logout completed successfully");
    return { success: true };

  } catch (error) {
    console.error("❌ Error during logout:", error);
    return { success: false, error: "Logout failed" };
  }
}