import { Brain, CheckCircle2, Filter, XCircle } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '@/shared/components/ui/PageHeader'
import { StatusBadge } from '@/shared/components/ui/StatusBadge'
import { DataState } from '@/shared/components/ui/DataState'
import { demoQuestions } from '@/data/demo/demoQuestions'

export function QuestionBankPage() {
  const [questions, setQuestions] = useState(demoQuestions)
  const isLoading = false
  const error = null

  const handleApprove = (questionId) => {
    setQuestions((current) =>
      current.map((item) =>
        item.id === questionId ? { ...item, status: 'approved' } : item,
      ),
    )
  }

  const handleReject = (questionId) => {
    setQuestions((current) =>
      current.map((item) =>
        item.id === questionId ? { ...item, status: 'rejected' } : item,
      ),
    )
  }

  const header = (
    <PageHeader
      title="Question Bank"
      description="Review official questions and AI-generated drafts before publishing them to tests."
      action={
        <button className="dev2-primary-button">
          <Brain size={16} />
          Generate AI Draft
        </button>
      }
    />
  )

  if (isLoading) {
    return (
      <section>
        {header}
        <DataState type="loading" title="Loading questions" description="Preparing the question bank." />
      </section>
    )
  }

  if (error) {
    return (
      <section>
        {header}
        <DataState type="error" title="Question bank unavailable" description={error} />
      </section>
    )
  }

  if (questions.length === 0) {
    return (
      <section>
        {header}
        <DataState
          type="empty"
          title="No questions found"
          description="Create or generate a draft question before publishing tests."
        />
      </section>
    )
  }

  return (
    <section>
      {header}

      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Filter size={16} />
          Filter by CLO, Bloom level, difficulty, or review status.
        </div>

        <input
          type="text"
          placeholder="Search questions..."
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 md:w-80"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Question</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">CLO</th>
                <th className="px-4 py-3">Bloom</th>
                <th className="px-4 py-3">Difficulty</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {questions.map((item) => (
                <tr key={item.id} className="align-top hover:bg-slate-50">
                  <td className="max-w-md px-4 py-4">
                    <p className="font-medium text-slate-900">{item.question}</p>
                    {item.isAiGenerated ? (
                      <p className="mt-1 text-xs font-medium text-purple-600">
                        AI-generated draft - SME review required
                      </p>
                    ) : null}
                  </td>

                  <td className="px-4 py-4 text-slate-600">{item.type}</td>
                  <td className="px-4 py-4 text-slate-600">{item.clo}</td>
                  <td className="px-4 py-4 text-slate-600">{item.bloom}</td>
                  <td className="px-4 py-4 text-slate-600">{item.difficulty}</td>
                  <td className="px-4 py-4"><StatusBadge status={item.status} /></td>
                  <td className="px-4 py-4 text-slate-500">{item.source}</td>

                  <td className="px-4 py-4">
                    {item.status === 'review' || item.status === 'draft' ? (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleApprove(item.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                        >
                          <CheckCircle2 size={14} />
                          Approve
                        </button>

                        <button
                          onClick={() => handleReject(item.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                        >
                          <XCircle size={14} />
                          Reject
                        </button>
                      </div>
                    ) : (
                      <p className="text-right text-xs text-slate-400">Reviewed</p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
