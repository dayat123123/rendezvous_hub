import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { GuestBadge } from '@/components/badges'
import { renderWithProviders } from '@/test/render'

import { GuestBanner } from './guest-banner'

describe('GuestBanner', () => {
  it('warns that the guest is unverified and lists the guest SOP', () => {
    renderWithProviders(
      <GuestBanner guest={{ login_id: 'BUDI01', problem: 'pin', verified: false, recent_24h: 1 }} />,
    )
    const banner = screen.getByRole('note', {
      name: 'Pengadu belum login dan identitasnya BELUM terverifikasi.',
    })
    expect(within(banner).getByText('BUDI01')).toBeInTheDocument()
    expect(within(banner).getByText('Lupa PIN')).toBeInTheDocument()
    const recent = within(banner).getByText('1 pengaduan tamu untuk Login ID ini dalam 24 jam')
    expect(recent).not.toHaveAttribute('data-alert')
    expect(within(banner).queryByText(/Pengaduan berulang/)).not.toBeInTheDocument()
    expect(
      within(banner)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([
      'Jangan sebutkan data akun (email, nomor HP, rekening, saldo, alamat).',
      'Bantuan akun hanya lewat Reset password/PIN dari menu Akun Nasabah (cari sendiri Login ID-nya), yang dikirim ke email terdaftar.',
      'Jangan mengubah email, nomor HP, atau data akun berdasarkan chat ini; arahkan ke kantor cabang dengan identitas.',
      'Jangan minta atau terima password, PIN, OTP.',
    ])
  })

  it('highlights repeated guest complaints for the same Login ID', () => {
    renderWithProviders(
      <GuestBanner guest={{ login_id: 'BUDI01', problem: 'password', verified: false, recent_24h: 3 }} />,
    )
    const recent = screen.getByText(/3 pengaduan tamu untuk Login ID ini dalam 24 jam/)
    expect(recent).toHaveAttribute('data-alert', 'true')
    expect(recent).toHaveTextContent('Pengaduan berulang: waspadai penyalahgunaan.')
    expect(screen.getByText('Lupa password')).toBeInTheDocument()
  })

  it('says the Login ID was not provided and leaves the repeat count out', () => {
    renderWithProviders(<GuestBanner guest={{ problem: 'locked', verified: false, recent_24h: 0 }} />)
    expect(screen.getByText('tidak diisi')).toBeInTheDocument()
    expect(screen.getByText('Akun terkunci atau ditangguhkan')).toBeInTheDocument()
    expect(screen.queryByText(/pengaduan tamu untuk Login ID ini/)).not.toBeInTheDocument()
  })
})

describe('GuestBadge', () => {
  it('reads as a guest marker with the unverified hint', () => {
    renderWithProviders(<GuestBadge />)
    const badge = screen.getByText('Tamu')
    expect(badge).toHaveAttribute('title', 'Pengadu belum login dan identitasnya belum terverifikasi')
    expect(badge).toHaveTextContent('Tamu: Pengadu belum login dan identitasnya belum terverifikasi')
  })
})
