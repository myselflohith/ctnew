import { query } from "../database/connection.js";
import type { User } from "./auth.service.js";

export type UpdateTalentProfileInput = {
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  city_state?: string | null;
  linkedin_profile_url?: string | null;
  photo_url?: string | null;
  skills?: string[] | null;
};

function normalizeString(val: unknown): string | null {
  if (val === undefined || val === null) return null;
  if (typeof val !== "string") return null;
  const trimmed = val.trim();
  return trimmed.length ? trimmed : null;
}

export async function updateTalentProfile(userId: string, input: UpdateTalentProfileInput): Promise<User> {
  const updates: string[] = [];
  const values: any[] = [];
  let i = 1;

  const set = (col: string, val: any) => {
    updates.push(`${col} = $${i++}`);
    values.push(val);
  };

  if (input.first_name !== undefined) set("first_name", normalizeString(input.first_name));
  if (input.last_name !== undefined) set("last_name", normalizeString(input.last_name));
  if (input.phone !== undefined) set("phone", normalizeString(input.phone));
  if (input.city_state !== undefined) set("city_state", normalizeString(input.city_state));
  if (input.linkedin_profile_url !== undefined)
    set("linkedin_profile_url", normalizeString(input.linkedin_profile_url));
  if (input.photo_url !== undefined) set("photo_url", normalizeString(input.photo_url));
  if (input.skills !== undefined)
    set(
      "skills",
      Array.isArray(input.skills) ? input.skills.filter((s) => typeof s === "string" && s.trim()).map((s) => s.trim()) : null
    );

  if (updates.length === 0) {
    throw new Error("No fields to update");
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);

  values.push(userId);

  await query(`UPDATE users SET ${updates.join(", ")} WHERE id = $${i}`, values);

  const { getUserById } = await import("./auth.service.js");
  const user = await getUserById(userId);
  if (!user) throw new Error("User not found");
  return user;
}
