'use client'

import React, { useState } from 'react'
import {
  X,
  Calendar as CalIcon,
  Clock,
  MapPin,
  AlignLeft,
  Users,
  Edit2,
  Trash2,
  HeartHandshake,
} from 'lucide-react'
import { CalendarEvent } from '@/types/database'
import { useAuth } from '@/context/AuthContext'
import { useCalendar } from '@/context/CalendarContext'
import {
  formatDateInTz,
  formatTimeRangeInTz,
  getCountryFlag,
} from '@/lib/timezones'
import { UserAvatar } from '../ui/UserAvatar'

interface PlanDetailModalProps {
  isOpen: boolean
  onClose: () => void
  plan: CalendarEvent | null
  onEdit: (plan: CalendarEvent) => void
}

export function PlanDetailModal({
  isOpen,
  onClose,
  plan,
  onEdit,
}: PlanDetailModalProps) {
  const { profile, partner, user } = useAuth()
  const { deleteEvent } = useCalendar()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen || !plan) return null

  const userTimezone = profile?.timezone || 'Asia/Kolkata'
  const partnerTimezone = partner?.timezone || 'Europe/Amsterdam'

  const userDateFormatted = formatDateInTz(plan.start_time, userTimezone)
  const userTimeRange = formatTimeRangeInTz(plan.start_time, plan.end_time, userTimezone, true)

  const partnerDateFormatted = partner ? formatDateInTz(plan.start_time, partnerTimezone) : ''
  const partnerTimeRange = partner
    ? formatTimeRangeInTz(plan.start_time, plan.end_time, partnerTimezone, true)
    : ''

  const isCreator = user?.id === plan.created_by

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this plan?')) return
    setLoading(true)
    const { error: err } = await deleteEvent(plan.id)
    if (err) {
      setError(err.message || 'Failed to delete plan')
      setLoading(false)
      return
    }
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-warm-950/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-ios-xl border border-warm-200 shadow-soft-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-warm-100 bg-warm-50/40">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                  plan.audience === 'FRIENDS'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                {plan.audience === 'FRIENDS' ? '🥂 With Friends' : '❤️ Together'}
              </span>
            </div>
            <h2 className="text-xl font-bold font-display text-warm-900 tracking-tight">
              {plan.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-warm-500 hover:text-warm-800 hover:bg-warm-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Times in both zones */}
          <div className="rounded-2xl bg-warm-50/80 border border-warm-200/80 p-4 space-y-3">
            {/* User time */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{getCountryFlag(profile?.country)}</span>
                <div>
                  <div className="text-xs font-bold text-warm-900">
                    {profile?.name || 'You'} ({profile?.country || 'Local'})
                  </div>
                  <div className="text-[11px] text-warm-600 font-medium">
                    {userDateFormatted}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-warm-900 font-mono">
                  {userTimeRange}
                </span>
              </div>
            </div>

            {/* Partner time */}
            {partner && (
              <div className="flex items-start justify-between pt-2.5 border-t border-warm-200/60">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{getCountryFlag(partner.country)}</span>
                  <div>
                    <div className="text-xs font-bold text-warm-900">
                      {partner.name} ({partner.country || 'Partner'})
                    </div>
                    <div className="text-[11px] text-warm-600 font-medium">
                      {partnerDateFormatted}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-warm-900 font-mono">
                    {partnerTimeRange}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Location */}
          {plan.location && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-white border border-warm-200/70 text-xs text-warm-800">
              <MapPin className="w-4 h-4 text-warm-500 mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold block text-warm-900">Location / Platform</span>
                <span>{plan.location}</span>
              </div>
            </div>
          )}

          {/* Description */}
          {plan.description && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-white border border-warm-200/70 text-xs text-warm-800">
              <AlignLeft className="w-4 h-4 text-warm-500 mt-0.5 shrink-0" />
              <div className="space-y-0.5">
                <span className="font-semibold block text-warm-900">Notes</span>
                <p className="whitespace-pre-wrap leading-relaxed">{plan.description}</p>
              </div>
            </div>
          )}

          {/* Creator info */}
          <div className="flex items-center justify-between text-[11px] text-warm-500 pt-2">
            <span>
              Created by{' '}
              <strong className="text-warm-700">
                {plan.creator_profile?.name || (isCreator ? 'You' : 'Partner')}
              </strong>
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-warm-50/50 border-t border-warm-100 flex items-center justify-between">
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200/60 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose()
                onEdit(plan)
              }}
              className="px-4 py-2 rounded-xl bg-warm-800 hover:bg-warm-900 text-white text-xs font-semibold flex items-center gap-1.5 shadow-soft-sm transition-all"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Plan</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
