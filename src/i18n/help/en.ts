import type { Translated } from '../id'
import { helpAdmin } from './admin-en'
import type { help as source } from './id'

export const help: Translated<typeof source> = {
  admin: helpAdmin,
  flag: {
    menu: {
      complaint: 'Flag as complaint',
      fraud: 'Flag as fraud',
    },
    title: {
      complaint: 'Flag as a complaint',
      fraud: 'Flag as fraud',
    },
    description: {
      complaint:
        'The ticket is recorded as a complaint with a regulatory resolution deadline. The customer is notified and the Compliance team is alerted right away.',
      fraud:
        'The ticket is raised to P1 and routed to the fraud team. The Compliance team is alerted right away.',
    },
    action: {
      complaint: 'Flag complaint',
      fraud: 'Flag fraud',
    },
    reason: 'Reason',
    hint: 'Required, 5–300 characters. Saved in the ticket history and visible to Compliance.',
    done: {
      complaint: 'Ticket flagged as a complaint',
      fraud: 'Ticket flagged as fraud',
    },
    errors: {
      reason_required: 'The reason must be 5–300 characters.',
      already_flagged: 'The ticket already has this flag.',
      not_ticket_owner: 'Another agent is handling this ticket.',
    },
  },
  ticket: {
    intake: 'Customer intake answers',
    sop: 'Topic SOP',
  },
  extras: {
    column: 'Intake & SOP',
    summary: '{{intake}} questions · {{replies}} replies',
    hasSop: 'SOP',
    open: 'Intake & SOP',
    openNamed: 'Set up intake questions, suggested replies and the SOP for {{name}}',
    title: 'Intake & SOP: {{name}}',
    intake: 'Intake questions',
    intakeHint:
      'Asked after the customer picks the topic, before the chat starts. Up to {{max}} questions; answers show in the ticket panel.',
    fieldNumber: 'Question {{number}}',
    key: 'Key',
    type: 'Field type',
    types: {
      text: 'Text',
      number: 'Number',
      date: 'Date',
      choice: 'Choice',
    },
    required: 'Required',
    questionId: 'Question (Indonesian)',
    questionEn: 'Question (English)',
    options: 'Choice options (2–10)',
    optionValue: 'Value',
    labelId: 'Label (Indonesian)',
    labelEn: 'Label (English)',
    addOption: 'Add option',
    removeOption: 'Remove option {{number}}',
    addField: 'Add question',
    removeField: 'Remove question {{number}}',
    replies: 'Suggested customer replies',
    repliesHint:
      'Quick reply buttons above the CS chat input in the app. Up to {{max}} replies, {{length}} characters each.',
    replyId: 'Reply {{number}} (Indonesian)',
    replyEn: 'Reply {{number}} (English)',
    addReply: 'Add reply',
    removeReply: 'Remove reply {{number}}',
    sop: 'SOP for agents',
    sopHint: 'Internal notes: handling steps and documents to ask for. Only agents can see it.',
    fixErrors: 'Check the fields marked in red.',
    saved: 'Intake & SOP for {{name}} saved',
    errors: {
      key: 'Lowercase letters, digits or underscores; starts with a letter; 2–32 characters.',
      keyDuplicate: 'Another question already uses this key.',
      label: '2–80 characters.',
      options: 'A choice needs 2–10 options.',
      optionValue: 'Lowercase letters, digits or underscores; 1–32 characters.',
      optionDuplicate: 'Another option already uses this value.',
      optionLabel: '1–60 characters.',
      reply: '1–40 characters.',
      sop: 'At most 4,000 characters.',
    },
  },
  faqInsert: {
    menu: 'Insert FAQ article',
    title: 'Insert FAQ article',
    description:
      'The article question and answer are inserted into the reply as plain text in the ticket language ({{language}}). Review it before sending.',
    search: 'Search published articles',
    results: 'Article search results',
    empty: 'No matching articles.',
    insert: 'Insert',
    flag: 'Flag as outdated',
    flagNote: 'What needs updating?',
    flagHint: 'Required, 5–300 characters. Sent to the Help Center editors.',
    flagSubmit: 'Send note',
    flagged: 'Article flagged as outdated',
    openFlags_one: 'Already flagged {{count}} time and not handled yet.',
    openFlags_other: 'Already flagged {{count}} times and not handled yet.',
    tooLong: 'The reply would exceed {{max}} characters. Clear some text first.',
  },
  faqFlags: {
    menu: 'Notes from agents ({{count}})',
    badge_one: '{{count}} note says it needs updating',
    badge_other: '{{count}} notes say it needs updating',
    title: 'Notes from agents: {{question}}',
    empty: 'No notes from agents yet.',
    by: '{{name}} · {{time}}',
    resolvedBy: 'Resolved by {{name}} · {{time}}',
    resolve: 'Mark resolved',
    confirmTitle: 'Mark all notes resolved?',
    confirmBody_one: '{{count}} open note will be marked resolved and recorded in the Audit Trail.',
    confirmBody_other: '{{count}} open notes will be marked resolved and recorded in the Audit Trail.',
    resolved: 'Notes marked resolved',
  },
  guest: {
    title: 'The complainant is not logged in and their identity is NOT verified.',
    loginId: 'Claimed Login ID',
    notFilled: 'not provided',
    problemLabel: 'Problem',
    problem: {
      password: 'Forgot password',
      pin: 'Forgot PIN',
      locked: 'Account locked or suspended',
      other: 'Other login problem',
    },
    recent_one: '{{count}} guest complaint for this Login ID in 24 hours',
    recent_other: '{{count}} guest complaints for this Login ID in 24 hours',
    repeatHint: 'Repeated complaints: watch for abuse.',
    sopTitle: 'Guest complaint SOP',
    sop: {
      noData: 'Do not mention any account data (email, phone number, accounts, balance, address).',
      resetOnly:
        'Account help only through Reset password/PIN in the Customer account panel, which is sent to the registered email.',
      noChanges:
        'Do not change the email, phone number or account data based on this chat; refer the customer to a branch office with ID.',
      noSecrets: 'Do not ask for or accept passwords, PINs or OTPs.',
    },
    customer: 'Guest (not logged in)',
    claimedLogin: 'Claimed Login ID: {{loginId}}',
    noLoginId: 'No Login ID provided; ask for the Login ID or search in the Customer accounts menu.',
    loginNotFound:
      'Login ID {{loginId}} was not found in csAdmin. Ask for the Login ID again or search in the Customer accounts menu.',
    openNasabah: 'Open Customer accounts',
    settingTitle: 'Complaints without login',
    settingHint:
      'Customers who cannot log in can file a complaint from the app login page without an OTP. The identity is not verified; the ticket joins the normal queue marked Guest, and Reset password/PIN is still sent only to the registered email.',
    settingOnTitle: 'Turn on complaints without login?',
    settingOnBody:
      'The complaint button shows again on the app login page. Guest complaints join the CS queue marked Guest.',
    settingOffTitle: 'Turn off complaints without login?',
    settingOffBody:
      'Customers who cannot log in can no longer file a complaint from the app. Existing guest tickets can still be handled.',
  },
  reminder: {
    title: 'Reminder for tickets waiting on the customer',
    hint: 'Send the customer an automatic message when they have not replied for N hours while the ticket waits on them, before the ticket closes automatically.',
    hours: 'Send the reminder after (hours, 1–72)',
    messageHint: 'The reminder text is set in Settings → Automatic messages.',
    confirmTitle: 'Save the ticket reminder?',
    confirmOn:
      "Customers get a reminder when they have not replied {{hours}} hours after the agent's last reply.",
    confirmOff: 'Automatic reminders are turned off. Tickets still close automatically as configured.',
  },
}
