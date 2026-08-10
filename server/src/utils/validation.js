const isValidEmail = (email) => {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

const isValidName = (name) => {
  return (
    typeof name === "string" &&
    name.trim().length >= 2 &&
    name.trim().length <= 100
  );
};

const isValidPassword = (password) => {
  return typeof password === "string" && password.length >= 6;
};

const optionalString = (value, maxLength = 500) => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
};

const isStringArray = (value) => {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
};

module.exports = {
  isValidEmail,
  isValidName,
  isValidPassword,
  optionalString,
  isStringArray,
};
