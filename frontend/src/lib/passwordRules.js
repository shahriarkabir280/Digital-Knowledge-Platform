export const PASSWORD_RULES = [
  { key: 'length', test: (value) => value.length >= 8, message: 'at least 8 characters', label: '8+ characters' },
  { key: 'uppercase', test: (value) => /[A-Z]/.test(value), message: 'an uppercase letter', label: 'Uppercase letter' },
  { key: 'lowercase', test: (value) => /[a-z]/.test(value), message: 'a lowercase letter', label: 'Lowercase letter' },
  { key: 'number', test: (value) => /[0-9]/.test(value), message: 'a number', label: 'Number' },
  { key: 'special', test: (value) => /[^A-Za-z0-9]/.test(value), message: 'a special character', label: 'Special character' },
]

export function getPasswordError(password) {
  const failed = PASSWORD_RULES.filter((rule) => !rule.test(password)).map((rule) => rule.message)
  if (failed.length === 0) {
    return ''
  }
  return `Password must contain ${failed.join(', ')}.`
}

export function getPasswordChecks(password) {
  return PASSWORD_RULES.map((rule) => ({ key: rule.key, label: rule.label, passed: rule.test(password) }))
}
