export const inr = (n: number) => (n === 0 ? "Free" : `₹${new Intl.NumberFormat("en-IN").format(n)}`);

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => (Array.from(word)[0] ?? "").toUpperCase())
    .join("") || "★";

export const cleanHandle = (h: string) =>
  h
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^@+/, "")
    .replace(/[/?].*$/, "")
    .toLowerCase();