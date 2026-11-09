import { describe, expect, it } from 'vitest'

import { cleanExtras, emptyField, extrasProblems, topicExtras } from './topic-extras'

describe('topic extras', () => {
  it('reads missing extras from older topic rows as empty', () => {
    expect(topicExtras({})).toEqual({ intake: [], customer_replies: [], sop: null })
  })

  it('flags bad keys, duplicates, labels, choice options, replies and a long SOP', () => {
    const problems = extrasProblems({
      intake: [
        { ...emptyField(), key: 'order_no', label_id: 'Nomor order', label_en: 'Order number' },
        { ...emptyField(), key: 'order_no', label_id: 'X', label_en: 'Order again' },
        {
          key: 'Kanal',
          type: 'choice',
          label_id: 'Kanal',
          label_en: 'Channel',
          required: true,
          options: [
            { value: 'app', label_id: 'Aplikasi', label_en: 'App' },
            { value: 'app', label_id: '', label_en: 'Web' },
          ],
        },
        { ...emptyField(), type: 'choice', key: 'only', label_id: 'Satu', label_en: 'One', options: [] },
      ],
      customer_replies: [
        { id: 'Sudah saya coba', en: 'I tried that' },
        { id: '', en: 'x'.repeat(41) },
      ],
      sop: 'x'.repeat(4001),
    })
    expect(problems).toEqual({
      'intake.1.key': 'keyDuplicate',
      'intake.1.label_id': 'label',
      'intake.2.key': 'key',
      'intake.2.options.1.value': 'optionDuplicate',
      'intake.2.options.1.label_id': 'optionLabel',
      'intake.3.options': 'options',
      'replies.1.id': 'reply',
      'replies.1.en': 'reply',
      sop: 'sop',
    })
  })

  it('trims the payload, drops options from non-choice fields and empties a blank SOP', () => {
    expect(
      cleanExtras({
        intake: [
          {
            key: ' amount ',
            type: 'number',
            label_id: ' Jumlah ',
            label_en: ' Amount ',
            required: true,
            options: [{ value: 'x', label_id: 'x', label_en: 'x' }],
          },
        ],
        customer_replies: [{ id: ' Belum bisa ', en: ' Not yet ' }],
        sop: '   ',
      }),
    ).toEqual({
      intake: [
        {
          key: 'amount',
          type: 'number',
          label_id: 'Jumlah',
          label_en: 'Amount',
          required: true,
          options: [],
        },
      ],
      customer_replies: [{ id: 'Belum bisa', en: 'Not yet' }],
      sop: null,
    })
  })
})
