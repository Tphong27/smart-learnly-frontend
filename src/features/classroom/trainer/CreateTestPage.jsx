import { useState } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import {
  ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Layers3,
  Plus, Settings, Sparkles, Trash2, X,
} from 'lucide-react'
import { createClassTest, getClassTestById, updateClassTest } from '@/data/demo/classFlowRuntime'

const STEPS = [
  { key: 'info', label: 'Test Info', icon: BookOpen },
  { key: 'questions', label: 'Questions', icon: Layers3 },
  { key: 'config', label: 'Configuration', icon: Settings },
]

const emptyQuestion = () => ({
  id: `q-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
  text: '',
  options: ['', '', '', ''],
  correctIndex: 0,
  explanation: '',
})

function generateAiQuestions(count = 5) {
  const pool = [
    { text: 'What is cloud computing?', options: ['Local storage', 'On-demand IT via internet', 'Physical servers only', 'Offline computing'], correctIndex: 1, explanation: 'Cloud computing delivers IT resources over the internet.' },
    { text: 'Which is a benefit of cloud computing?', options: ['Higher upfront cost', 'Less flexibility', 'Pay-as-you-go', 'Longer deployment'], correctIndex: 2, explanation: 'Cloud offers pay-as-you-go pricing models.' },
    { text: 'What does IaaS stand for?', options: ['Internet as a Service', 'Infrastructure as a Service', 'Information as a Service', 'Integration as a Service'], correctIndex: 1, explanation: 'IaaS provides virtualized computing resources over the internet.' },
    { text: 'Which AWS service provides object storage?', options: ['EC2', 'RDS', 'S3', 'Lambda'], correctIndex: 2, explanation: 'Amazon S3 is an object storage service.' },
    { text: 'What is the shared responsibility model?', options: ['AWS does everything', 'Customer does everything', 'Security is shared between AWS and customer', 'No one is responsible'], correctIndex: 2, explanation: 'AWS and customers share security responsibilities.' },
    { text: 'What is auto scaling?', options: ['Manual server management', 'Automatic capacity adjustment', 'Fixed resource allocation', 'Database optimization'], correctIndex: 1, explanation: 'Auto scaling automatically adjusts capacity based on demand.' },
    { text: 'Which pricing model offers biggest discount for flexible timing?', options: ['On-Demand', 'Reserved', 'Spot', 'Dedicated'], correctIndex: 2, explanation: 'Spot instances offer up to 90% discount for interruptible workloads.' },
    { text: 'What is a VPC?', options: ['Virtual Private Cloud', 'Very Private Computer', 'Virtual Public Cloud', 'Virtual Protocol Connection'], correctIndex: 0, explanation: 'VPC is an isolated virtual network in AWS.' },
  ]
  const selected = []
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  for (let i = 0; i < Math.min(count, shuffled.length); i++) {
    selected.push({
      ...shuffled[i],
      id: `ai-q-${Date.now()}-${i}`,
    })
  }
  return selected
}

const sampleQuestionBank = [
  { id: 'qb-1', text: 'What is IAM?', options: ['Database', 'Identity and Access Management', 'Storage', 'Compute'], correctIndex: 1 },
  { id: 'qb-2', text: 'What does MFA stand for?', options: ['My First App', 'Multi-Factor Authentication', 'Managed Firewall Access', 'Main Function API'], correctIndex: 1 },
  { id: 'qb-3', text: 'Which service is serverless?', options: ['EC2', 'Lambda', 'RDS', 'EBS'], correctIndex: 1 },
  { id: 'qb-4', text: 'What is the principle of least privilege?', options: ['Give max access', 'Give minimum needed permissions', 'No access control', 'Public access'], correctIndex: 1 },
  { id: 'qb-5', text: 'Which is a NoSQL database?', options: ['RDS', 'DynamoDB', 'Aurora', 'Redshift'], correctIndex: 1 },
  { id: 'qb-6', text: 'What is CloudFront?', options: ['Compute service', 'CDN', 'Database', 'Messaging service'], correctIndex: 1 },
]

export function CreateTestPage() {
  const navigate = useNavigate()
  const { classId, testId } = useParams()
  const context = useOutletContext()

  const isEdit = !!testId
  const existingTest = isEdit ? getClassTestById(testId) : null

  const [step, setStep] = useState(0)
  const [title, setTitle] = useState(existingTest?.title || '')
  const [description, setDescription] = useState(existingTest?.description || '')
  const [testType, setTestType] = useState(existingTest?.type || 'Practice Test')
  const [questions, setQuestions] = useState(existingTest?.questions || [])

  // Config state
  const [config, setConfig] = useState({
    startTime: existingTest?.startTime || '',
    endTime: existingTest?.endTime || '',
    timeLimit: existingTest?.timeLimit || 20,
    shuffleQuestions: existingTest?.shuffleQuestions || false,
    shuffleAnswers: existingTest?.shuffleAnswers || false,
    showCorrectAnswers: existingTest?.showCorrectAnswers !== false,
    allowRetake: existingTest?.allowRetake !== false,
    maxAttempts: existingTest?.maxAttempts || 0,
    passingScore: existingTest?.passingScore || 70,
  })

  // Question creation mode
  const [questionMode, setQuestionMode] = useState(null) // 'manual' | 'bank' | 'ai'
  const [editingQuestion, setEditingQuestion] = useState(null)
  const [aiCount, setAiCount] = useState(5)
  const [bankSelected, setBankSelected] = useState(new Set())

  const updateConfig = (key, value) => setConfig((p) => ({ ...p, [key]: value }))

  const addManualQuestion = () => {
    setEditingQuestion(emptyQuestion())
    setQuestionMode('manual')
  }

  const saveQuestion = () => {
    if (!editingQuestion.text.trim()) return
    const exists = questions.find((q) => q.id === editingQuestion.id)
    if (exists) {
      setQuestions((qs) => qs.map((q) => (q.id === editingQuestion.id ? editingQuestion : q)))
    } else {
      setQuestions((qs) => [...qs, editingQuestion])
    }
    setEditingQuestion(null)
    setQuestionMode(null)
  }

  const removeQuestion = (id) => {
    setQuestions((qs) => qs.filter((q) => q.id !== id))
  }

  const addFromBank = () => {
    const selected = sampleQuestionBank.filter((q) => bankSelected.has(q.id))
    const newQuestions = selected
      .filter((q) => !questions.find((ex) => ex.id === q.id))
      .map((q) => ({ ...q }))
    setQuestions((qs) => [...qs, ...newQuestions])
    setBankSelected(new Set())
    setQuestionMode(null)
  }

  const addAiQuestions = () => {
    const generated = generateAiQuestions(aiCount)
    setQuestions((qs) => [...qs, ...generated])
    setQuestionMode(null)
  }

  const handlePublish = () => {
    if (!title.trim()) return
    const data = {
      title,
      description,
      type: testType,
      questions,
      numberOfQuestions: questions.length,
      ...config,
      status: 'published',
    }
    if (isEdit) {
      updateClassTest(testId, data)
    } else {
      createClassTest(classId, data)
    }
    navigate(`/trainer/classes/${classId}/tests`)
  }

  const handleSaveDraft = () => {
    if (!title.trim()) return
    const data = {
      title,
      description,
      type: testType,
      questions,
      numberOfQuestions: questions.length,
      ...config,
      status: 'draft',
    }
    if (isEdit) {
      updateClassTest(testId, data)
    } else {
      createClassTest(classId, data)
    }
    navigate(`/trainer/classes/${classId}/tests`)
  }

  return (
    <div>
      {/* Step indicator */}
      <div className="classflow-section" style={{ padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <button type="button" className="demo-secondary-action" onClick={() => navigate(`/trainer/classes/${classId}/tests`)} style={{ padding: '0.35rem 0.75rem' }}>
            <ArrowLeft size={14} /> Back to Tests
          </button>
          <h2 style={{ fontWeight: 700, color: '#0f172a', margin: 0, flex: 1 }}>
            {isEdit ? 'Edit Test' : 'Create New Test'}
          </h2>
        </div>

        <div className="classflow-stepper">
          {STEPS.map((s, i) => (
            <button
              key={s.key}
              type="button"
              className={`classflow-stepper__step${step === i ? ' active' : ''}${step > i ? ' completed' : ''}`}
              onClick={() => setStep(i)}
            >
              <span className="classflow-stepper__number">{step > i ? '✓' : i + 1}</span>
              <s.icon size={14} />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Step 1: Test Info */}
      {step === 0 ? (
        <div className="classflow-section">
          <h3 style={{ fontWeight: 700, color: '#0f172a', marginBottom: '1rem' }}>Test Information</h3>
          <div className="course-flow-form-grid">
            <label className="course-flow-field course-flow-field--wide">
              <span>Test Title *</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter test title" />
            </label>
            <label className="course-flow-field course-flow-field--wide">
              <span>Description</span>
              <textarea rows="3" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the test..." />
            </label>
            <label className="course-flow-field">
              <span>Test Type</span>
              <select value={testType} onChange={(e) => setTestType(e.target.value)}>
                <option value="Practice Test">Practice Test</option>
                <option value="Module Test">Module Test</option>
                <option value="Mock Test">Mock Test</option>
                <option value="Final Test">Final Test</option>
              </select>
            </label>
          </div>
          <div className="demo-actions" style={{ marginTop: '1rem', justifyContent: 'flex-end' }}>
            <button type="button" className="demo-primary-action" onClick={() => setStep(1)} disabled={!title.trim()}>
              Next: Questions <ArrowRight size={14} />
            </button>
          </div>
        </div>
      ) : null}

      {/* Step 2: Questions */}
      {step === 1 ? (
        <div className="classflow-section">
          <div className="classflow-section__header">
            <h3 style={{ fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Questions ({questions.length})
            </h3>
          </div>

          {/* Add question options */}
          <div className="classflow-option-cards" style={{ gridTemplateColumns: '1fr 1fr 1fr', marginBottom: '1.5rem' }}>
            <button type="button" className={`classflow-option-card${questionMode === 'bank' ? ' active' : ''}`} onClick={() => setQuestionMode('bank')}>
              <div className="classflow-option-card__icon"><BookOpen size={24} /></div>
              <div className="classflow-option-card__title">From Question Bank</div>
              <div className="classflow-option-card__desc">Select existing questions</div>
            </button>
            <button type="button" className={`classflow-option-card${questionMode === 'manual' ? ' active' : ''}`} onClick={addManualQuestion}>
              <div className="classflow-option-card__icon"><Plus size={24} /></div>
              <div className="classflow-option-card__title">Create Manually</div>
              <div className="classflow-option-card__desc">Write your own question</div>
            </button>
            <button type="button" className={`classflow-option-card${questionMode === 'ai' ? ' active' : ''}`} onClick={() => setQuestionMode('ai')}>
              <div className="classflow-option-card__icon"><Sparkles size={24} /></div>
              <div className="classflow-option-card__title">Generate with AI</div>
              <div className="classflow-option-card__desc">Auto-generate questions</div>
            </button>
          </div>

          {/* Question Bank picker */}
          {questionMode === 'bank' ? (
            <div className="classflow-submission-panel" style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 style={{ fontWeight: 600, color: '#0f172a', margin: 0 }}>Select from Question Bank</h4>
                <button type="button" className="demo-secondary-action" onClick={() => setQuestionMode(null)} style={{ padding: '0.25rem 0.5rem' }}><X size={14} /></button>
              </div>
              <div className="demo-list">
                {sampleQuestionBank.map((q) => {
                  const alreadyAdded = questions.find((ex) => ex.id === q.id)
                  return (
                    <label key={q.id} className="demo-list-item" style={{ opacity: alreadyAdded ? 0.5 : 1 }}>
                      <div>
                        <strong>{q.text}</strong>
                        <small>{q.options.length} options</small>
                      </div>
                      <input
                        type="checkbox"
                        disabled={!!alreadyAdded}
                        checked={bankSelected.has(q.id)}
                        onChange={() => {
                          const next = new Set(bankSelected)
                          next.has(q.id) ? next.delete(q.id) : next.add(q.id)
                          setBankSelected(next)
                        }}
                      />
                    </label>
                  )
                })}
              </div>
              <div className="demo-actions" style={{ marginTop: '0.75rem' }}>
                <button type="button" className="demo-secondary-action" onClick={() => setQuestionMode(null)}>Cancel</button>
                <button type="button" className="demo-primary-action" onClick={addFromBank} disabled={bankSelected.size === 0}>
                  <Plus size={14} /> Add Selected ({bankSelected.size})
                </button>
              </div>
            </div>
          ) : null}

          {/* Manual question editor */}
          {questionMode === 'manual' && editingQuestion ? (
            <div className="classflow-submission-panel" style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 style={{ fontWeight: 600, color: '#0f172a', margin: 0 }}>Create Question</h4>
                <button type="button" className="demo-secondary-action" onClick={() => { setQuestionMode(null); setEditingQuestion(null) }} style={{ padding: '0.25rem 0.5rem' }}><X size={14} /></button>
              </div>
              <label className="course-flow-field">
                <span>Question Text *</span>
                <textarea
                  rows="2"
                  value={editingQuestion.text}
                  onChange={(e) => setEditingQuestion((q) => ({ ...q, text: e.target.value }))}
                  placeholder="Enter question..."
                />
              </label>
              <div style={{ marginTop: '0.75rem' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569' }}>Options (select correct answer)</span>
                {editingQuestion.options.map((opt, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem' }}>
                    <input
                      type="radio"
                      name="correct"
                      checked={editingQuestion.correctIndex === i}
                      onChange={() => setEditingQuestion((q) => ({ ...q, correctIndex: i }))}
                    />
                    <input
                      style={{ flex: 1, padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '0.5rem', fontSize: '0.875rem' }}
                      value={opt}
                      onChange={(e) => {
                        const opts = [...editingQuestion.options]
                        opts[i] = e.target.value
                        setEditingQuestion((q) => ({ ...q, options: opts }))
                      }}
                      placeholder={`Option ${String.fromCharCode(65 + i)}`}
                    />
                  </div>
                ))}
              </div>
              <label className="course-flow-field" style={{ marginTop: '0.75rem' }}>
                <span>Explanation (optional)</span>
                <input
                  value={editingQuestion.explanation || ''}
                  onChange={(e) => setEditingQuestion((q) => ({ ...q, explanation: e.target.value }))}
                  placeholder="Why is this the correct answer?"
                />
              </label>
              <div className="demo-actions" style={{ marginTop: '0.75rem' }}>
                <button type="button" className="demo-secondary-action" onClick={() => { setQuestionMode(null); setEditingQuestion(null) }}>Cancel</button>
                <button type="button" className="demo-primary-action" onClick={saveQuestion} disabled={!editingQuestion.text.trim()}>
                  <CheckCircle2 size={14} /> Save Question
                </button>
              </div>
            </div>
          ) : null}

          {/* AI generate */}
          {questionMode === 'ai' ? (
            <div className="classflow-submission-panel" style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 style={{ fontWeight: 600, color: '#0f172a', margin: 0 }}>Generate with AI</h4>
                <button type="button" className="demo-secondary-action" onClick={() => setQuestionMode(null)} style={{ padding: '0.25rem 0.5rem' }}><X size={14} /></button>
              </div>
              <label className="course-flow-field">
                <span>Number of questions to generate</span>
                <input type="number" min="1" max="20" value={aiCount} onChange={(e) => setAiCount(Number(e.target.value))} />
              </label>
              <p className="demo-muted" style={{ fontSize: '0.8125rem', margin: '0.5rem 0' }}>
                AI will generate multiple-choice questions based on the course content.
              </p>
              <div className="demo-actions" style={{ marginTop: '0.75rem' }}>
                <button type="button" className="demo-secondary-action" onClick={() => setQuestionMode(null)}>Cancel</button>
                <button type="button" className="demo-primary-action" onClick={addAiQuestions}>
                  <Sparkles size={14} /> Generate {aiCount} Questions
                </button>
              </div>
            </div>
          ) : null}

          {/* Question list */}
          {questions.length === 0 ? (
            <p className="demo-muted" style={{ textAlign: 'center', padding: '2rem' }}>
              No questions added yet. Use the options above to add questions.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {questions.map((q, idx) => (
                <div key={q.id} style={{ border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1rem', background: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#2563eb', marginRight: '0.5rem' }}>Q{idx + 1}</span>
                      <strong style={{ color: '#0f172a' }}>{q.text}</strong>
                      <div style={{ marginTop: '0.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem' }}>
                        {q.options.map((opt, oi) => (
                          <div
                            key={oi}
                            style={{
                              padding: '0.35rem 0.75rem',
                              borderRadius: '0.375rem',
                              fontSize: '0.8125rem',
                              background: q.correctIndex === oi ? '#dcfce7' : '#f8fafc',
                              border: `1px solid ${q.correctIndex === oi ? '#86efac' : '#e2e8f0'}`,
                              color: q.correctIndex === oi ? '#15803d' : '#334155',
                            }}
                          >
                            {String.fromCharCode(65 + oi)}. {opt}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="demo-actions" style={{ flexShrink: 0 }}>
                      <button type="button" className="demo-secondary-action" onClick={() => { setEditingQuestion(q); setQuestionMode('manual') }} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                        Edit
                      </button>
                      <button type="button" className="demo-secondary-action" onClick={() => removeQuestion(q.id)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: '#ef4444' }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="demo-actions" style={{ marginTop: '1rem', justifyContent: 'space-between' }}>
            <button type="button" className="demo-secondary-action" onClick={() => setStep(0)}>
              <ArrowLeft size={14} /> Back
            </button>
            <button type="button" className="demo-primary-action" onClick={() => setStep(2)}>
              Next: Configuration <ArrowRight size={14} />
            </button>
          </div>
        </div>
      ) : null}

      {/* Step 3: Configuration */}
      {step === 2 ? (
        <div className="classflow-section">
          <h3 style={{ fontWeight: 700, color: '#0f172a', marginBottom: '1rem' }}>Test Configuration</h3>

          <div className="course-flow-form-grid">
            <label className="course-flow-field">
              <span>Start Time</span>
              <input type="datetime-local" value={config.startTime} onChange={(e) => updateConfig('startTime', e.target.value)} />
            </label>
            <label className="course-flow-field">
              <span>End Time</span>
              <input type="datetime-local" value={config.endTime} onChange={(e) => updateConfig('endTime', e.target.value)} />
            </label>
            <label className="course-flow-field">
              <span>Time Limit (minutes)</span>
              <input type="number" min="1" value={config.timeLimit} onChange={(e) => updateConfig('timeLimit', Number(e.target.value))} />
            </label>
            <label className="course-flow-field">
              <span>Passing Score (%)</span>
              <input type="number" min="0" max="100" value={config.passingScore} onChange={(e) => updateConfig('passingScore', Number(e.target.value))} />
            </label>
            <label className="course-flow-field">
              <span>Max Attempts (0 = unlimited)</span>
              <input type="number" min="0" value={config.maxAttempts} onChange={(e) => updateConfig('maxAttempts', Number(e.target.value))} />
            </label>
          </div>

          <div style={{ marginTop: '1.25rem' }}>
            <h4 style={{ fontWeight: 600, color: '#475569', marginBottom: '0.75rem' }}>Options</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label className="classflow-toggle-row">
                <div>
                  <strong>Shuffle Questions</strong>
                  <small>Randomize the order of questions for each attempt</small>
                </div>
                <input type="checkbox" checked={config.shuffleQuestions} onChange={(e) => updateConfig('shuffleQuestions', e.target.checked)} />
              </label>
              <label className="classflow-toggle-row">
                <div>
                  <strong>Shuffle Answers</strong>
                  <small>Randomize the order of answer options</small>
                </div>
                <input type="checkbox" checked={config.shuffleAnswers} onChange={(e) => updateConfig('shuffleAnswers', e.target.checked)} />
              </label>
              <label className="classflow-toggle-row">
                <div>
                  <strong>Show Correct Answers</strong>
                  <small>Display correct answers after submission</small>
                </div>
                <input type="checkbox" checked={config.showCorrectAnswers} onChange={(e) => updateConfig('showCorrectAnswers', e.target.checked)} />
              </label>
              <label className="classflow-toggle-row">
                <div>
                  <strong>Allow Retake</strong>
                  <small>Allow trainees to retake the test</small>
                </div>
                <input type="checkbox" checked={config.allowRetake} onChange={(e) => updateConfig('allowRetake', e.target.checked)} />
              </label>
            </div>
          </div>

          {/* Summary */}
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
            <h4 style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.5rem' }}>Summary</h4>
            <div className="classflow-info-grid">
              <div className="classflow-info-item">
                <div className="classflow-info-item__label">Title</div>
                <div className="classflow-info-item__value">{title || 'Untitled'}</div>
              </div>
              <div className="classflow-info-item">
                <div className="classflow-info-item__label">Questions</div>
                <div className="classflow-info-item__value">{questions.length}</div>
              </div>
              <div className="classflow-info-item">
                <div className="classflow-info-item__label">Time Limit</div>
                <div className="classflow-info-item__value">{config.timeLimit} min</div>
              </div>
              <div className="classflow-info-item">
                <div className="classflow-info-item__label">Passing Score</div>
                <div className="classflow-info-item__value">{config.passingScore}%</div>
              </div>
            </div>
          </div>

          <div className="demo-actions" style={{ marginTop: '1rem', justifyContent: 'space-between' }}>
            <button type="button" className="demo-secondary-action" onClick={() => setStep(1)}>
              <ArrowLeft size={14} /> Back
            </button>
            <div className="demo-actions">
              <button type="button" className="demo-secondary-action" onClick={handleSaveDraft}>
                Save as Draft
              </button>
              <button type="button" className="demo-primary-action" onClick={handlePublish} disabled={!title.trim()}>
                <CheckCircle2 size={14} /> {isEdit ? 'Save & Publish' : 'Publish Test'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
