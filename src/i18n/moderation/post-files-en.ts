import type { Translated } from '../id'
import type { moderationPostFiles as source } from './post-files-id'

export const moderationPostFiles: Translated<typeof source> = {
  title: 'Documents',
  add: 'Add document',
  accountFirst: 'Choose the official account before adding documents.',
  input: 'Choose documents',
  hint: 'PDF, Excel (.xlsx), CSV, Word (.docx), or PowerPoint (.pptx). Up to {{max}} documents, 20 MB per file (CSV 10 MB). Old .xls, .doc, .ppt, and .xlsm formats are not accepted.',
  name: 'Document {{index}} name',
  remove: 'Remove document {{name}}',
  open: 'Open {{name}}',
  openShort: 'Open',
  openFailed: 'The document could not be opened. Try again.',
  states: {
    uploading: 'Uploading…',
    done: 'Uploaded',
    failed: 'Failed',
  },
  staleAccount: 'Uploaded for another official account. Remove it and upload it again for this account.',
  accountChanged:
    'The official account changed. Documents already uploaded must be removed and uploaded again for this account.',
  types: {
    pdf: 'PDF',
    xlsx: 'Excel',
    csv: 'CSV',
    docx: 'Word',
    pptx: 'PowerPoint',
  },
  problems: {
    legacy: '{{name}}: old formats are not accepted. Save it again as .xlsx, .docx, or .pptx.',
    type: '{{name}}: unsupported file type. Choose a PDF, .xlsx, .csv, .docx, or .pptx.',
    empty: '{{name}}: the file is empty.',
    size: '{{name}}: larger than {{max}}.',
    tooMany: 'At most {{max}} documents per post.',
    uploading: 'Wait until every document has finished uploading.',
    failed: 'Remove the documents that failed to upload, then upload them again.',
    stale:
      'Some documents belong to another official account. Remove them and upload them again for this account.',
    names: 'Check the document names.',
    nameRequired: 'The document name is required.',
    nameLong: 'The document name can be at most {{max}} characters.',
    nameChars: 'The document name cannot contain slashes or control characters.',
  },
  errors: {
    too_many_files: 'At most 5 documents per post.',
    invalid_file:
      'Documents must be uploaded from the Hub for this official account. Remove it and upload it again.',
    file_not_found: 'The document has not reached storage yet. Remove it and upload it again.',
    file_too_large: 'The document is over the size limit (20 MB, CSV 10 MB).',
    invalid_file_type: 'The document contents do not match its extension.',
    duplicate_file: 'The same document is attached twice.',
    invalid_file_name: 'Document names are 1–120 characters without slashes.',
    upload_forbidden: 'This account may not upload documents for that official account.',
  },
}
