const SECRET_REPLACEMENT = "[redacted]";
const SENSITIVE_KEY_PATTERN =
  /(api[_-]?key|auth|bearer|cookie|credential|gho_|password|proxy|secret|sid|token)/i;
const TOKEN_VALUE_PATTERN =
  /(sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9_]{20,}|Bearer\s+[A-Za-z0-9._-]{20,}|xox[baprs]-[A-Za-z0-9-]{20,})/g;
const WINDOWS_HOME_PATTERN = /C:\\Users\\[^\\\s"']+/gi;

function isSensitiveKey(key) {
  return SENSITIVE_KEY_PATTERN.test(String(key));
}

function redactString(value) {
  if (typeof value !== "string") return value;
  return value
    .replace(TOKEN_VALUE_PATTERN, SECRET_REPLACEMENT)
    .replace(WINDOWS_HOME_PATTERN, "%USERPROFILE%");
}

function truncate(value, max = 1200) {
  if (typeof value !== "string") return value;
  if (value.length <= max) return value;
  return `${value.slice(0, max)}\n...[truncated ${value.length - max} chars]`;
}

function redactValue(value, key = "") {
  if (isSensitiveKey(key)) return SECRET_REPLACEMENT;
  if (Array.isArray(value)) return value.map((item) => redactValue(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => [
        childKey,
        redactValue(childValue, childKey)
      ])
    );
  }
  if (typeof value === "string") return redactString(value);
  return value;
}

function redactLine(line) {
  const keyMatch = String(line).match(/^\s*([A-Za-z0-9_.-]+)\s*=/);
  if (keyMatch && isSensitiveKey(keyMatch[1])) {
    return line.replace(/=.*/, "= \"[redacted]\"");
  }
  return redactString(line);
}

function redactText(text, max = 4000) {
  return truncate(String(text).split(/\r?\n/).map(redactLine).join("\n"), max);
}

module.exports = {
  SECRET_REPLACEMENT,
  isSensitiveKey,
  redactLine,
  redactString,
  redactText,
  redactValue,
  truncate
};
