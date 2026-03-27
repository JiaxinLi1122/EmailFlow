// ============================================================
// Email Body Cleaner
// Strips noise (signatures, legal disclaimers, quoted replies)
// while preserving the actual message content.
// The full original is always kept in DB — this only affects AI input.
// ============================================================

/**
 * Remove email signatures, legal disclaimers, and quoted replies.
 * Returns cleaned text that preserves all meaningful content.
 */
export function cleanEmailBody(body: string): string {
  let cleaned = body

  // 1. Remove quoted reply chains ("> " lines and "On ... wrote:" headers)
  //    Keep the first level of quote if short, remove deeper nesting
  cleaned = removeDeepQuotes(cleaned)

  // 2. Remove forwarded message headers
  cleaned = cleaned.replace(/^-{3,}\s*Forwarded message\s*-{3,}$/gim, '')
  cleaned = cleaned.replace(/^Begin forwarded message:$/gim, '')

  // 3. Remove common email signatures
  cleaned = removeSignature(cleaned)

  // 4. Remove legal disclaimers / confidentiality notices
  cleaned = removeLegalDisclaimer(cleaned)

  // 5. Collapse excessive whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim()

  return cleaned
}

/**
 * Prepare body text for the classification skill.
 * Classification only needs to determine "action vs awareness vs ignore"
 * — the first portion of the email is usually sufficient.
 */
export function prepareForClassification(body: string, maxLength = 500): string {
  const cleaned = cleanEmailBody(body)
  if (cleaned.length <= maxLength) return cleaned
  return cleaned.slice(0, maxLength) + '...'
}

/**
 * Prepare body text for the task extraction skill.
 * Extraction needs more content to find all action items and deadlines,
 * but still benefits from noise removal.
 */
export function prepareForExtraction(body: string, maxLength = 2000): string {
  const cleaned = cleanEmailBody(body)
  if (cleaned.length <= maxLength) return cleaned

  // Keep beginning + end (deadlines often at the end)
  const headLength = Math.floor(maxLength * 0.7)
  const tailLength = maxLength - headLength - 20  // 20 chars for separator
  const head = cleaned.slice(0, headLength)
  const tail = cleaned.slice(-tailLength)
  return head + '\n\n[...]\n\n' + tail
}

// ---- Internal helpers ----

function removeDeepQuotes(text: string): string {
  const lines = text.split('\n')
  const result: string[] = []

  for (const line of lines) {
    // Remove lines with 2+ levels of quoting (>> or > >)
    if (/^>\s*>/.test(line)) continue

    // Remove "On <date>, <person> wrote:" headers
    if (/^On .+wrote:\s*$/i.test(line)) continue

    // Remove "From: ... Sent: ... To: ... Subject: ..." blocks (Outlook-style quote headers)
    if (/^(From|Sent|To|Subject|Date|Cc):\s/i.test(line) && result.length > 0) {
      // Only skip if this looks like a quote header block (multiple such lines in a row)
      const prev = result[result.length - 1]
      if (/^(From|Sent|To|Subject|Date|Cc):\s/i.test(prev)) {
        result.pop()  // Remove the previous header line too
        continue
      }
    }

    result.push(line)
  }

  return result.join('\n')
}

function removeSignature(text: string): string {
  // Common signature separators
  const sigPatterns = [
    /^--\s*$/m,                          // "-- " (standard sig separator)
    /^_{3,}\s*$/m,                       // "___" underscores
    /^-{3,}\s*$/m,                       // "---" dashes
    /^(Best|Regards|Thanks|Cheers|Sincerely|Kind regards|Best regards|Thank you|Warm regards),?\s*$/im,
    /^(Sent from my (iPhone|iPad|Android|Galaxy|Pixel|mobile))/im,
  ]

  for (const pattern of sigPatterns) {
    const match = text.match(pattern)
    if (match && match.index !== undefined) {
      // Only trim if the signature area is less than 40% of total text
      // (avoid cutting off emails that happen to start with "Thanks,")
      const sigStart = match.index
      if (sigStart > text.length * 0.4) {
        return text.slice(0, sigStart).trim()
      }
    }
  }

  return text
}

function removeLegalDisclaimer(text: string): string {
  // Common disclaimer openers
  const disclaimerPatterns = [
    /^(CONFIDENTIALITY|DISCLAIMER|LEGAL NOTICE|PRIVILEGE|NOTICE)[\s:]/im,
    /^This (email|message|communication) (is|and any|may contain) (confidential|privileged|intended)/im,
    /^The information (contained in|transmitted by) this/im,
    /^If you (are not|have received) the intended recipient/im,
  ]

  for (const pattern of disclaimerPatterns) {
    const match = text.match(pattern)
    if (match && match.index !== undefined) {
      // Only trim if disclaimer is in the bottom 50% of the email
      if (match.index > text.length * 0.5) {
        return text.slice(0, match.index).trim()
      }
    }
  }

  return text
}
