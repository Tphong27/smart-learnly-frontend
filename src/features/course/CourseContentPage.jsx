import { BookOpen, FileText, Layers3, Upload } from 'lucide-react'
import { PageHeader } from '@/shared/components/ui/PageHeader'
import { ProgressBar } from '@/shared/components/ui/ProgressBar'
import { StatusBadge } from '@/shared/components/ui/StatusBadge'
import { demoCourses, demoModules } from '@/data/demo/demoCourses'

export function CourseContentPage() {
  return (
    <section>
      <PageHeader
        title="Course Content"
        description="Organize modules, lessons, materials, and publishing status for assigned courses."
        action={
          <button className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            <Upload size={16} />
            Upload Material
          </button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Assigned Courses</h2>

          <div className="mt-4 space-y-3">
            {demoCourses.map((course) => (
              <div key={course.id} className="rounded-xl border border-slate-100 p-4 hover:bg-slate-50">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{course.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{course.category}</p>
                  </div>
                  <StatusBadge status={course.status} />
                </div>

                <div className="mt-4">
                  <ProgressBar value={course.progress} label="Content readiness" />
                </div>
              </div>
            ))}
          </div>
        </aside>

        <main className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                AWS Cloud Practitioner Foundation
              </h2>
              <p className="text-sm text-slate-500">
                Manage official content before publishing to trainees.
              </p>
            </div>

            <button className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Preview as Trainee
            </button>
          </div>

          <div className="space-y-4">
            {demoModules.map((module) => (
              <div key={module.id} className="rounded-2xl border border-slate-100 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="rounded-xl bg-blue-50 p-2 text-blue-700">
                      <Layers3 size={18} />
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900">{module.title}</p>
                      <p className="text-sm text-slate-500">
                        {module.lessons.length} lessons
                      </p>
                    </div>
                  </div>

                  <StatusBadge status={module.status} />
                </div>

                <div className="mt-4 divide-y divide-slate-100">
                  {module.lessons.map((lesson) => (
                    <div key={lesson.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <span className="rounded-lg bg-slate-100 p-2 text-slate-600">
                          {lesson.type === 'Video' ? <BookOpen size={16} /> : <FileText size={16} />}
                        </span>
                        <div>
                          <p className="font-medium text-slate-800">{lesson.title}</p>
                          <p className="text-sm text-slate-500">{lesson.type}</p>
                        </div>
                      </div>

                      <StatusBadge status={lesson.status} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </section>
  )
}