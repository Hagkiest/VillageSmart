import { useState, useEffect, useMemo } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, Plus, User, Search, X } from 'lucide-react'
import {
  ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

import { fetchJson, postJson, deleteJson } from '../lib/api'
import { dialog } from "../lib/dialog";

type MigrantWorker = {
  id: number
  seq?: number
  resident_id: number | null
  full_name: string
  gender: string
  identity_number: string
  village_group: string
  phone: string
  household_type: string
  work_status: string
  is_employed: boolean
  work_area: string
  work_address: string
  work_industry: string
  work_type: string
  employer: string
  start_date: string
  expected_return_date: string
  actual_return_date: string
  is_special_group: boolean
  month_income: string
  year_income: string
  notes: string
  updated_at: string
}

type Pagination = {
  page: number
  page_size: number
  total: number
  total_pages: number
}

type MigrantStats = {
  total_residents: number
  labor_force: number
  out_working: number
  returned: number
  special_group: number
}

type Resident = {
  id: number
  full_name: string
  gender: string
  identity_number: string
  village_group: string
  phone: string
}

export function WorkInfo() {
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month')
  const [stats, setStats] = useState<MigrantStats | null>(null)
  const [chartData, setChartData] = useState<any[]>([])
  const [workers, setWorkers] = useState<MigrantWorker[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, page_size: 10, total: 0, total_pages: 0 })
  const [loading, setLoading] = useState(false)

  const [filters, setFilters] = useState({
    full_name: '',
    identity_number: '',
    village_group: '',
    work_status: '全部',
  })

  const [showAddModal, setShowAddModal] = useState(false)
  const [showSelectResidentModal, setShowSelectResidentModal] = useState(false)
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null)
  const [searchResidentParams, setSearchResidentParams] = useState({ full_name: '', identity_number: '', village_group: '' })
  const [residents, setResidents] = useState<Resident[]>([])
  const [residentsLoading, setResidentsLoading] = useState(false)

  const [formData, setFormData] = useState({
    work_status: '在外务工' as '在外务工' | '已返乡',
    is_employed: true,
    work_area: '',
    work_address: '',
    work_industry: '',
    work_type: '',
    employer: '',
    start_date: '',
    expected_return_date: '',
    actual_return_date: '',
    is_special_group: false,
    month_income: '',
    year_income: '',
    notes: '',
  })

  const villageGroups = ['一组', '二组', '三组', '四组', '五组']
  const workStatuses = ['全部', '在外务工', '已返乡']

  useEffect(() => {
    loadStats()
    loadWorkers()
  }, [])

  useEffect(() => {
    loadTrend()
  }, [viewMode])

  async function loadStats(villageGroup?: string) {
    try {
      const params = villageGroup && villageGroup !== '全部村组' ? { village_group: villageGroup } : {}
      const data = await fetchJson('/api/migrant-workers/stats/', { params })
      setStats(data)
    } catch (error) {
      console.error('加载统计数据失败:', error)
    }
  }

  async function loadTrend() {
    try {
      const data = await fetchJson('/api/migrant-workers/trend/', { params: { view_mode: viewMode } })
      setChartData(data.data || [])
    } catch (error) {
      console.error('加载趋势数据失败:', error)
    }
  }

  async function loadWorkers(page = 1) {
    setLoading(true)
    try {
      const params = {
        ...filters,
        page,
        page_size: 10,
      }
      const data = await fetchJson('/api/migrant-workers/', { params })
      setWorkers(data.items || [])
      setPagination(data.pagination || { page: 1, page_size: 10, total: 0, total_pages: 0 })
    } catch (error) {
      console.error('加载务工人员列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  async function searchResidents() {
    setResidentsLoading(true)
    try {
      const params = {
        full_name: searchResidentParams.full_name,
        identity_number: searchResidentParams.identity_number,
        village_group: searchResidentParams.village_group,
        page: 1,
        page_size: 20,
      }
      const data = await fetchJson('/api/residents/', { params })
      setResidents(data.items || [])
    } catch (error) {
      console.error('搜索居民失败:', error)
    } finally {
      setResidentsLoading(false)
    }
  }

  function handleSelectResident(resident: Resident) {
    setSelectedResident(resident)
    setShowSelectResidentModal(false)
  }

  async function handleAddWorker() {
    if (!selectedResident) {
      await dialog.alert('请先选择居民');
      return
    }

    try {
      await postJson('/api/migrant-workers/create/', {
        resident_id: selectedResident.id,
        ...formData,
      })
      await dialog.alert('添加成功');
      setShowAddModal(false)
      setSelectedResident(null)
      setFormData({
        work_status: '在外务工',
        is_employed: true,
        work_area: '',
        work_address: '',
        work_industry: '',
        work_type: '',
        employer: '',
        start_date: '',
        expected_return_date: '',
        actual_return_date: '',
        is_special_group: false,
        month_income: '',
        year_income: '',
        notes: '',
      })
      loadWorkers()
      loadStats()
    } catch (error) {
      console.error('添加务工人员失败:', error)
      await dialog.alert('添加失败，请稍后重试');
    }
  }

  async function handleDeleteWorker(id: number) {
    if (!await dialog.confirm('确定要删除该务工信息吗？')) return
    try {
      await deleteJson(`/api/migrant-workers/${id}/`)
      await dialog.alert('删除成功');
      loadWorkers()
      loadStats()
    } catch (error) {
      console.error('删除务工信息失败:', error)
      await dialog.alert('删除失败，请稍后重试');
    }
  }

  function handleFilterChange(key: string, value: string) {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  function handleSearch() {
    loadWorkers(1)
  }

  function handleReset() {
    setFilters({
      full_name: '',
      identity_number: '',
      village_group: '',
      work_status: '全部',
    })
    loadWorkers(1)
  }

  function formatDate(dateStr: string) {
    if (!dateStr) return '-'
    return dateStr.split('T')[0]
  }

  return (
    <div className="space-y-4">
      {/* 务工居民列表 */}
      <div className="bg-white rounded border px-5 py-4" style={{ borderColor: '#e4e7ed' }}>
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium" style={{ color: '#303133' }}>
              务工居民列表
            </span>
          </div>
        </div>
        <p className="text-xs mb-4" style={{ color: '#909399' }}>
          显示居民基础信息与最新务工状态
        </p>

        {/* 筛选条件 */}
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <div className="flex items-center gap-1.5">
            <span className="text-sm whitespace-nowrap" style={{ color: '#606266' }}>姓名</span>
            <input
              type="text"
              placeholder="姓名"
              value={filters.full_name}
              onChange={(e) => handleFilterChange('full_name', e.target.value)}
              className="rounded text-sm px-2.5 py-1.5 focus:outline-none"
              style={{ border: '1px solid #dcdfe6', width: 110, background: '#fff', color: '#303133' }}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm whitespace-nowrap" style={{ color: '#606266' }}>身份证号</span>
            <input
              type="text"
              placeholder="身份证号"
              value={filters.identity_number}
              onChange={(e) => handleFilterChange('identity_number', e.target.value)}
              className="rounded text-sm px-2.5 py-1.5 focus:outline-none"
              style={{ border: '1px solid #dcdfe6', width: 150, background: '#fff', color: '#303133' }}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm whitespace-nowrap" style={{ color: '#606266' }}>村组</span>
            <div className="relative" style={{ width: 100 }}>
              <select
                value={filters.village_group}
                onChange={(e) => handleFilterChange('village_group', e.target.value)}
                className="w-full rounded text-sm px-2.5 py-1.5 focus:outline-none appearance-none pr-6"
                style={{
                  border: '1px solid #dcdfe6',
                  background: '#fff',
                  color: filters.village_group ? '#303133' : '#c0c4cc',
                }}
              >
                <option value="">村组</option>
                {villageGroups.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              <ChevronDown
                className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ width: 12, height: 12, color: '#c0c4cc' }}
              />
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm whitespace-nowrap" style={{ color: '#606266' }}>务工状态</span>
            <div className="relative" style={{ width: 90 }}>
              <select
                value={filters.work_status}
                onChange={(e) => handleFilterChange('work_status', e.target.value)}
                className="w-full rounded text-sm px-2.5 py-1.5 focus:outline-none appearance-none pr-6"
                style={{
                  border: '1px solid #dcdfe6',
                  background: '#fff',
                  color: '#303133',
                }}
              >
                {workStatuses.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <ChevronDown
                className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ width: 12, height: 12, color: '#c0c4cc' }}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleSearch}
            className="rounded text-sm px-3 py-1.5 whitespace-nowrap transition-opacity hover:opacity-85 flex items-center gap-1"
            style={{ background: '#409eff', color: '#fff', border: 'none' }}
          >
            <Search style={{ width: 14, height: 14 }} />
            查询
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="rounded text-sm px-3 py-1.5 whitespace-nowrap transition-opacity hover:opacity-85"
            style={{ background: '#fff', color: '#606266', border: '1px solid #dcdfe6' }}
          >
            重置
          </button>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="rounded text-sm px-3 py-1.5 whitespace-nowrap transition-opacity hover:opacity-85 flex items-center gap-1"
            style={{ background: '#fa8c16', color: '#fff', border: 'none' }}
          >
            <Plus style={{ width: 14, height: 14 }} />
            新增务工人员
          </button>
        </div>

        {/* 表格 */}
        <div className="overflow-x-auto" style={{ border: '1px solid #e4e7ed', borderRadius: 4 }}>
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse', minWidth: 1000 }}>
            <thead>
              <tr style={{ background: '#fafafa' }}>
                <th className="px-3 py-2.5 text-left whitespace-nowrap" style={{ borderBottom: '1px solid #e4e7ed', color: '#606266', fontWeight: 500, fontSize: 13 }}>
                  序号
                </th>
                <th className="px-3 py-2.5 text-left whitespace-nowrap" style={{ borderBottom: '1px solid #e4e7ed', color: '#606266', fontWeight: 500, fontSize: 13 }}>
                  姓名
                </th>
                <th className="px-3 py-2.5 text-left whitespace-nowrap" style={{ borderBottom: '1px solid #e4e7ed', color: '#606266', fontWeight: 500, fontSize: 13 }}>
                  性别
                </th>
                <th className="px-3 py-2.5 text-left whitespace-nowrap" style={{ borderBottom: '1px solid #e4e7ed', color: '#606266', fontWeight: 500, fontSize: 13 }}>
                  身份证码
                </th>
                <th className="px-3 py-2.5 text-left whitespace-nowrap" style={{ borderBottom: '1px solid #e4e7ed', color: '#606266', fontWeight: 500, fontSize: 13 }}>
                  村组
                </th>
                <th className="px-3 py-2.5 text-left whitespace-nowrap" style={{ borderBottom: '1px solid #e4e7ed', color: '#606266', fontWeight: 500, fontSize: 13 }}>
                  务工状态
                </th>
                <th className="px-3 py-2.5 text-left whitespace-nowrap" style={{ borderBottom: '1px solid #e4e7ed', color: '#606266', fontWeight: 500, fontSize: 13 }}>
                  开始时间
                </th>
                <th className="px-3 py-2.5 text-left whitespace-nowrap" style={{ borderBottom: '1px solid #e4e7ed', color: '#606266', fontWeight: 500, fontSize: 13 }}>
                  务工地址
                </th>
                <th className="px-3 py-2.5 text-left whitespace-nowrap" style={{ borderBottom: '1px solid #e4e7ed', color: '#606266', fontWeight: 500, fontSize: 13 }}>
                  单位名称
                </th>
                <th className="px-3 py-2.5 text-left whitespace-nowrap" style={{ borderBottom: '1px solid #e4e7ed', color: '#606266', fontWeight: 500, fontSize: 13 }}>
                  行业
                </th>
                <th className="px-3 py-2.5 text-left whitespace-nowrap" style={{ borderBottom: '1px solid #e4e7ed', color: '#606266', fontWeight: 500, fontSize: 13 }}>
                  工种
                </th>
                <th className="px-3 py-2.5 text-left whitespace-nowrap" style={{ borderBottom: '1px solid #e4e7ed', color: '#606266', fontWeight: 500, fontSize: 13 }}>
                  特殊人群
                </th>
                <th className="px-3 py-2.5 text-left whitespace-nowrap" style={{ borderBottom: '1px solid #e4e7ed', color: '#606266', fontWeight: 500, fontSize: 13 }}>
                  最近更新
                </th>
                <th className="px-3 py-2.5 text-left whitespace-nowrap" style={{ borderBottom: '1px solid #e4e7ed', color: '#606266', fontWeight: 500, fontSize: 13 }}>
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center" style={{ color: '#909399', fontSize: 13 }}>
                    加载中...
                  </td>
                </tr>
              ) : workers.length > 0 ? (
                workers.map((worker, idx) => (
                  <tr key={worker.id}>
                    <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #e4e7ed' }}>
                      {worker.seq || idx + 1}
                    </td>
                    <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #e4e7ed' }}>
                      {worker.full_name}
                    </td>
                    <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #e4e7ed' }}>
                      {worker.gender}
                    </td>
                    <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #e4e7ed' }}>
                      {worker.identity_number}
                    </td>
                    <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #e4e7ed' }}>
                      {worker.village_group}
                    </td>
                    <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #e4e7ed' }}>
                      <span
                        className="px-2 py-0.5 rounded text-xs"
                        style={{
                          background: worker.work_status === '在外务工' ? '#e6f7ff' : '#f6ffed',
                          color: worker.work_status === '在外务工' ? '#1890ff' : '#52c41a',
                        }}
                      >
                        {worker.work_status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #e4e7ed' }}>
                      {formatDate(worker.start_date)}
                    </td>
                    <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #e4e7ed' }}>
                      {worker.work_address || '-'}
                    </td>
                    <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #e4e7ed' }}>
                      {worker.employer || '-'}
                    </td>
                    <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #e4e7ed' }}>
                      {worker.work_industry || '-'}
                    </td>
                    <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #e4e7ed' }}>
                      {worker.work_type || '-'}
                    </td>
                    <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #e4e7ed' }}>
                      {worker.is_special_group ? '是' : '否'}
                    </td>
                    <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #e4e7ed' }}>
                      {formatDate(worker.updated_at)}
                    </td>
                    <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #e4e7ed' }}>
                      <button
                        type="button"
                        onClick={() => handleDeleteWorker(worker.id)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={14} className="py-12 text-center" style={{ color: '#909399', fontSize: 13 }}>
                    暂无数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        <div className="flex items-center justify-end gap-2 mt-3 text-sm" style={{ color: '#606266' }}>
          <span>共 {pagination.total} 条</span>
          <div className="relative" style={{ width: 88 }}>
            <select
              defaultValue="10条/页"
              className="w-full rounded text-sm px-2.5 py-1.5 focus:outline-none appearance-none pr-6"
              style={{ border: '1px solid #dcdfe6', background: '#fff', color: '#303133' }}
            >
              <option value="10条/页">10条/页</option>
              <option value="20条/页">20条/页</option>
              <option value="50条/页">50条/页</option>
            </select>
            <ChevronDown
              className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ width: 12, height: 12, color: '#c0c4cc' }}
            />
          </div>
          <button
            type="button"
            onClick={() => loadWorkers(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="w-7 h-7 rounded flex items-center justify-center hover:bg-gray-50 disabled:opacity-50"
            style={{ border: '1px solid #e4e7ed' }}
          >
            <ChevronLeft style={{ width: 13, height: 13 }} />
          </button>
          <button
            type="button"
            className="w-7 h-7 rounded text-sm text-white flex items-center justify-center"
            style={{ background: '#1890ff' }}
          >
            {pagination.page}
          </button>
          <button
            type="button"
            onClick={() => loadWorkers(pagination.page + 1)}
            disabled={pagination.page >= pagination.total_pages}
            className="w-7 h-7 rounded flex items-center justify-center hover:bg-gray-50 disabled:opacity-50"
            style={{ border: '1px solid #e4e7ed' }}
          >
            <ChevronRight style={{ width: 13, height: 13 }} />
          </button>
          <span>前往</span>
          <input
            type="number"
            defaultValue={1}
            min={1}
            max={pagination.total_pages || 1}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const page = parseInt((e.target as HTMLInputElement).value) || 1
                loadWorkers(page)
              }
            }}
            className="rounded px-1.5 py-1 text-sm text-center focus:outline-none"
            style={{ border: '1px solid #e4e7ed', width: 40 }}
          />
          <span>页</span>
        </div>
      </div>

      {/* 统计与上报 */}
      <div className="bg-white rounded border px-5 py-4" style={{ borderColor: '#e4e7ed' }}>
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium" style={{ color: '#303133' }}>
              统计与上报
            </span>
          </div>
          <div className="relative" style={{ width: 110 }}>
            <select
              defaultValue="全部村组"
              onChange={(e) => loadStats(e.target.value)}
              className="w-full rounded text-sm px-2.5 py-1.5 focus:outline-none appearance-none pr-6"
              style={{ border: '1px solid #dcdfe6', background: '#fff', color: '#303133' }}
            >
              <option value="全部村组">全部村组</option>
              {villageGroups.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
            <ChevronDown
              className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ width: 12, height: 12, color: '#c0c4cc' }}
            />
          </div>
        </div>
        <p className="text-xs mb-4" style={{ color: '#909399' }}>
          按辖区、去年、行业快速统计
        </p>

        {/* 统计卡片 */}
        <div
          className="flex divide-x rounded border mb-5"
          style={{ borderColor: '#e4e7ed', background: '#f8faff' }}
        >
          {[
            { label: '居民总数', value: stats?.total_residents || 0 },
            { label: '劳动力总数', value: stats?.labor_force || 0 },
            { label: '外出务工', value: stats?.out_working || 0 },
            { label: '已返乡', value: stats?.returned || 0 },
            { label: '特殊人数', value: stats?.special_group || 0 },
          ].map((card) => (
            <div key={card.label} className="flex-1 px-6 py-4" style={{ borderColor: '#e4e7ed' }}>
              <div className="text-xs mb-1.5" style={{ color: '#909399' }}>{card.label}</div>
              <div className="text-2xl font-semibold" style={{ color: '#303133' }}>{card.value}</div>
            </div>
          ))}
        </div>

        {/* 图表 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm" style={{ color: '#303133' }}>就业趋势分析</span>
            <div className="flex rounded overflow-hidden" style={{ border: '1px solid #dcdfe6' }}>
              <button
                type="button"
                onClick={() => setViewMode('month')}
                className="px-3 py-1 text-xs transition-colors"
                style={{
                  background: viewMode === 'month' ? '#1890ff' : '#fff',
                  color: viewMode === 'month' ? '#fff' : '#606266',
                }}
              >
                按月
              </button>
              <button
                type="button"
                onClick={() => setViewMode('year')}
                className="px-3 py-1 text-xs transition-colors"
                style={{
                  borderLeft: '1px solid #dcdfe6',
                  background: viewMode === 'year' ? '#1890ff' : '#fff',
                  color: viewMode === 'year' ? '#fff' : '#606266',
                }}
              >
                按年
              </button>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart
              data={chartData}
              margin={{ top: 10, right: 70, bottom: 0, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#909399', fontSize: 11 }}
              />
              <YAxis
                yAxisId="left"
                orientation="left"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#909399', fontSize: 11 }}
                label={{ value: '人数', position: 'insideTopLeft', offset: 4, fill: '#909399', fontSize: 11 }}
                domain={[0, 'dataMax + 5']}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#909399', fontSize: 11 }}
                label={{ value: '比例(%)', position: 'insideTopRight', offset: 4, fill: '#909399', fontSize: 11 }}
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{ borderRadius: 6, border: '1px solid #e4e7ed', fontSize: 12 }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, color: '#606266' }}
              />
              <Bar
                yAxisId="left"
                dataKey="就业人数"
                fill="#1890ff"
                barSize={viewMode === 'month' ? 14 : 30}
                radius={[2, 2, 0, 0]}
                minPointSize={1}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="劳动力就业率"
                stroke="#52c41a"
                strokeWidth={1.5}
                dot={{ r: 3, fill: '#52c41a', strokeWidth: 0 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="人口就业比"
                stroke="#faad14"
                strokeWidth={1.5}
                dot={{ r: 3, fill: '#faad14', strokeWidth: 0 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 新增务工人员弹窗 */}
      {showAddModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#e4e7ed' }}>
              <span className="text-lg font-medium" style={{ color: '#303133' }}>新增务工人员</span>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false)
                  setSelectedResident(null)
                  setFormData({
                    work_status: '在外务工',
                    is_employed: true,
                    work_area: '',
                    work_address: '',
                    work_industry: '',
                    work_type: '',
                    employer: '',
                    start_date: '',
                    expected_return_date: '',
                    actual_return_date: '',
                    is_special_group: false,
                    month_income: '',
                    year_income: '',
                    notes: '',
                  })
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>
            <div className="px-5 py-4 space-y-6">
              {/* 居民选择 */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#303133' }}>选择居民</label>
                {selectedResident ? (
                  <div className="p-3 rounded border" style={{ borderColor: '#e4e7ed', background: '#fafafa' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <User style={{ width: 20, height: 20, color: '#409eff' }} />
                        </div>
                        <div>
                          <div className="font-medium" style={{ color: '#303133' }}>{selectedResident.full_name}</div>
                          <div className="text-sm" style={{ color: '#909399' }}>{selectedResident.identity_number}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedResident(null)}
                        className="text-sm text-red-500 hover:text-red-700"
                      >
                        重新选择
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowSelectResidentModal(true)}
                    className="w-full p-3 rounded border border-dashed flex items-center justify-center gap-2 hover:bg-gray-50"
                    style={{ borderColor: '#dcdfe6', color: '#606266' }}
                  >
                    <Search style={{ width: 16, height: 16 }} />
                    <span>点击选择居民</span>
                  </button>
                )}
              </div>

              {selectedResident && (
                <>
                  {/* 居民基础信息 */}
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#303133' }}>居民基础信息</label>
                    <div className="grid grid-cols-3 gap-4 p-3 rounded border" style={{ borderColor: '#e4e7ed', background: '#fafafa' }}>
                      <div>
                        <div className="text-xs mb-1" style={{ color: '#909399' }}>姓名</div>
                        <div className="text-sm" style={{ color: '#303133' }}>{selectedResident.full_name}</div>
                      </div>
                      <div>
                        <div className="text-xs mb-1" style={{ color: '#909399' }}>身份证号</div>
                        <div className="text-sm" style={{ color: '#303133' }}>{selectedResident.identity_number}</div>
                      </div>
                      <div>
                        <div className="text-xs mb-1" style={{ color: '#909399' }}>村组</div>
                        <div className="text-sm" style={{ color: '#303133' }}>{selectedResident.village_group || '-'}</div>
                      </div>
                      <div>
                        <div className="text-xs mb-1" style={{ color: '#909399' }}>联系电话</div>
                        <div className="text-sm" style={{ color: '#303133' }}>{selectedResident.phone || '-'}</div>
                      </div>
                    </div>
                  </div>

                  {/* 务工基本情况 */}
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#303133' }}>务工基本情况</label>
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm mb-1" style={{ color: '#606266' }}>户属性</label>
                          <input
                            type="text"
                            value={selectedResident.village_group || ''}
                            disabled
                            className="w-full rounded text-sm px-2.5 py-1.5 focus:outline-none"
                            style={{ border: '1px solid #e4e7ed', background: '#f5f7fa', color: '#909399' }}
                          />
                        </div>
                        <div>
                          <label className="block text-sm mb-1" style={{ color: '#606266' }}>
                            <span className="text-red-500">*</span> 年度
                          </label>
                          <input
                            type="text"
                            value={new Date().getFullYear()}
                            disabled
                            className="w-full rounded text-sm px-2.5 py-1.5 focus:outline-none"
                            style={{ border: '1px solid #e4e7ed', background: '#f5f7fa', color: '#909399' }}
                          />
                        </div>
                        <div>
                          <label className="block text-sm mb-1" style={{ color: '#606266' }}>
                            <span className="text-red-500">*</span> 变更类型
                          </label>
                          <div className="relative" style={{ width: '100%' }}>
                            <select
                              value={formData.work_status}
                              onChange={(e) => setFormData(prev => ({ ...prev, work_status: e.target.value as '在外务工' | '已返乡' }))}
                              className="w-full rounded text-sm px-2.5 py-1.5 focus:outline-none appearance-none pr-6"
                              style={{ border: '1px solid #dcdfe6', background: '#fff', color: '#303133' }}
                            >
                              <option value="在外务工">外出务工</option>
                              <option value="已返乡">已返乡</option>
                            </select>
                            <ChevronDown
                              className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none"
                              style={{ width: 12, height: 12, color: '#c0c4cc' }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-sm mb-0" style={{ color: '#606266' }}>是否就业</label>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, is_employed: !prev.is_employed }))}
                          className={`w-10 h-5 rounded-full transition-colors relative ${formData.is_employed ? 'bg-blue-500' : 'bg-gray-300'}`}
                        >
                          <div
                            className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${formData.is_employed ? 'translate-x-5' : 'translate-x-0.5'}`}
                          />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm mb-1" style={{ color: '#606266' }}>务工区域</label>
                          <div className="relative" style={{ width: '100%' }}>
                            <select
                              value={formData.work_area}
                              onChange={(e) => setFormData(prev => ({ ...prev, work_area: e.target.value }))}
                              className="w-full rounded text-sm px-2.5 py-1.5 focus:outline-none appearance-none pr-6"
                              style={{ border: '1px solid #dcdfe6', background: '#fff', color: formData.work_area ? '#303133' : '#c0c4cc' }}
                            >
                              <option value="">请选择务工区域</option>
                              <option value="省内">省内</option>
                              <option value="省外">省外</option>
                              <option value="境外">境外</option>
                            </select>
                            <ChevronDown
                              className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none"
                              style={{ width: 12, height: 12, color: '#c0c4cc' }}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm mb-1" style={{ color: '#606266' }}>务工地址</label>
                          <div className="relative" style={{ width: '100%' }}>
                            <select
                              value={formData.work_address}
                              onChange={(e) => setFormData(prev => ({ ...prev, work_address: e.target.value }))}
                              className="w-full rounded text-sm px-2.5 py-1.5 focus:outline-none appearance-none pr-6"
                              style={{ border: '1px solid #dcdfe6', background: '#fff', color: formData.work_address ? '#303133' : '#c0c4cc' }}
                            >
                              <option value="">请选择省/市/区县/乡镇</option>
                              <option value="北京市">北京市</option>
                              <option value="上海市">上海市</option>
                              <option value="广东省">广东省</option>
                              <option value="浙江省">浙江省</option>
                              <option value="江苏省">江苏省</option>
                            </select>
                            <ChevronDown
                              className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none"
                              style={{ width: 12, height: 12, color: '#c0c4cc' }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm mb-1" style={{ color: '#606266' }}>详细地址</label>
                          <input
                            type="text"
                            value={formData.work_address}
                            onChange={(e) => setFormData(prev => ({ ...prev, work_address: e.target.value }))}
                            placeholder="街道、门牌号等详细地址"
                            className="w-full rounded text-sm px-2.5 py-1.5 focus:outline-none"
                            style={{ border: '1px solid #dcdfe6', background: '#fff', color: '#303133' }}
                          />
                        </div>
                        <div>
                          <label className="block text-sm mb-1" style={{ color: '#606266' }}>单位名称</label>
                          <input
                            type="text"
                            value={formData.employer}
                            onChange={(e) => setFormData(prev => ({ ...prev, employer: e.target.value }))}
                            placeholder="单位名称"
                            className="w-full rounded text-sm px-2.5 py-1.5 focus:outline-none"
                            style={{ border: '1px solid #dcdfe6', background: '#fff', color: '#303133' }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm mb-1" style={{ color: '#606266' }}>行业</label>
                          <div className="relative" style={{ width: '100%' }}>
                            <select
                              value={formData.work_industry}
                              onChange={(e) => setFormData(prev => ({ ...prev, work_industry: e.target.value }))}
                              className="w-full rounded text-sm px-2.5 py-1.5 focus:outline-none appearance-none pr-6"
                              style={{ border: '1px solid #dcdfe6', background: '#fff', color: formData.work_industry ? '#303133' : '#c0c4cc' }}
                            >
                              <option value="">请选择</option>
                              <option value="制造业">制造业</option>
                              <option value="建筑业">建筑业</option>
                              <option value="服务业">服务业</option>
                              <option value="交通运输业">交通运输业</option>
                              <option value="批发零售业">批发零售业</option>
                              <option value="住宿餐饮业">住宿餐饮业</option>
                              <option value="其他">其他</option>
                            </select>
                            <ChevronDown
                              className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none"
                              style={{ width: 12, height: 12, color: '#c0c4cc' }}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm mb-1" style={{ color: '#606266' }}>工种</label>
                          <div className="relative" style={{ width: '100%' }}>
                            <select
                              value={formData.work_type}
                              onChange={(e) => setFormData(prev => ({ ...prev, work_type: e.target.value }))}
                              className="w-full rounded text-sm px-2.5 py-1.5 focus:outline-none appearance-none pr-6"
                              style={{ border: '1px solid #dcdfe6', background: '#fff', color: formData.work_type ? '#303133' : '#c0c4cc' }}
                            >
                              <option value="">请选择或输入工种</option>
                              <option value="普工">普工</option>
                              <option value="技术工">技术工</option>
                              <option value="管理人员">管理人员</option>
                              <option value="服务员">服务员</option>
                              <option value="销售员">销售员</option>
                              <option value="其他">其他</option>
                            </select>
                            <ChevronDown
                              className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none"
                              style={{ width: 12, height: 12, color: '#c0c4cc' }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 收入与返乡情况 */}
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#303133' }}>收入与返乡情况</label>
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm mb-1" style={{ color: '#606266' }}>开始时间</label>
                          <input
                            type="date"
                            value={formData.start_date}
                            onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                            className="w-full rounded text-sm px-2.5 py-1.5 focus:outline-none"
                            style={{ border: '1px solid #dcdfe6', background: '#fff', color: '#303133' }}
                          />
                        </div>
                        <div>
                          <label className="block text-sm mb-1" style={{ color: '#606266' }}>预计返乡</label>
                          <input
                            type="date"
                            value={formData.expected_return_date}
                            onChange={(e) => setFormData(prev => ({ ...prev, expected_return_date: e.target.value }))}
                            className="w-full rounded text-sm px-2.5 py-1.5 focus:outline-none"
                            style={{ border: '1px solid #dcdfe6', background: '#fff', color: '#303133' }}
                          />
                        </div>
                        <div>
                          <label className="block text-sm mb-1" style={{ color: '#606266' }}>实际返乡</label>
                          <input
                            type="date"
                            value={formData.actual_return_date}
                            onChange={(e) => setFormData(prev => ({ ...prev, actual_return_date: e.target.value }))}
                            className="w-full rounded text-sm px-2.5 py-1.5 focus:outline-none"
                            style={{ border: '1px solid #dcdfe6', background: '#fff', color: '#303133' }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm mb-1" style={{ color: '#606266' }}>月收入</label>
                          <div className="relative" style={{ width: '100%' }}>
                            <select
                              value={formData.month_income}
                              onChange={(e) => setFormData(prev => ({ ...prev, month_income: e.target.value }))}
                              className="w-full rounded text-sm px-2.5 py-1.5 focus:outline-none appearance-none pr-6"
                              style={{ border: '1px solid #dcdfe6', background: '#fff', color: formData.month_income ? '#303133' : '#c0c4cc' }}
                            >
                              <option value="">请选择月收入</option>
                              <option value="3000以下">3000以下</option>
                              <option value="3000-5000">3000-5000</option>
                              <option value="5000-8000">5000-8000</option>
                              <option value="8000-12000">8000-12000</option>
                              <option value="12000以上">12000以上</option>
                            </select>
                            <ChevronDown
                              className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none"
                              style={{ width: 12, height: 12, color: '#c0c4cc' }}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm mb-1" style={{ color: '#606266' }}>年收入</label>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const current = parseInt(formData.year_income) || 0
                                setFormData(prev => ({ ...prev, year_income: Math.max(0, current - 10000).toString() }))
                              }}
                              className="w-8 h-8 rounded flex items-center justify-center"
                              style={{ border: '1px solid #dcdfe6', background: '#fff', color: '#303133' }}
                            >
                              -
                            </button>
                            <input
                              type="text"
                              value={formData.year_income}
                              onChange={(e) => setFormData(prev => ({ ...prev, year_income: e.target.value }))}
                              className="w-full rounded text-sm px-2.5 py-1.5 focus:outline-none text-center"
                              style={{ border: '1px solid #dcdfe6', background: '#fff', color: '#303133' }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const current = parseInt(formData.year_income) || 0
                                setFormData(prev => ({ ...prev, year_income: (current + 10000).toString() }))
                              }}
                              className="w-8 h-8 rounded flex items-center justify-center"
                              style={{ border: '1px solid #dcdfe6', background: '#fff', color: '#303133' }}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 其他备注 */}
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#303133' }}>其他备注</label>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <label className="text-sm mb-0" style={{ color: '#606266' }}>是否特殊人群</label>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, is_special_group: !prev.is_special_group }))}
                          className={`w-10 h-5 rounded-full transition-colors relative ${formData.is_special_group ? 'bg-blue-500' : 'bg-gray-300'}`}
                        >
                          <div
                            className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${formData.is_special_group ? 'translate-x-5' : 'translate-x-0.5'}`}
                          />
                        </button>
                      </div>

                      <div>
                        <label className="block text-sm mb-1" style={{ color: '#606266' }}>备注</label>
                        <textarea
                          value={formData.notes}
                          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                          rows={3}
                          className="w-full rounded text-sm px-2.5 py-1.5 focus:outline-none resize-none"
                          style={{ border: '1px solid #dcdfe6', background: '#fff', color: '#303133' }}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t" style={{ borderColor: '#e4e7ed' }}>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false)
                  setSelectedResident(null)
                  setFormData({
                    work_status: '在外务工',
                    is_employed: true,
                    work_area: '',
                    work_address: '',
                    work_industry: '',
                    work_type: '',
                    employer: '',
                    start_date: '',
                    expected_return_date: '',
                    actual_return_date: '',
                    is_special_group: false,
                    month_income: '',
                    year_income: '',
                    notes: '',
                  })
                }}
                className="rounded text-sm px-4 py-2"
                style={{ background: '#fff', color: '#606266', border: '1px solid #dcdfe6' }}
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleAddWorker}
                disabled={!selectedResident}
                className="rounded text-sm px-4 py-2 disabled:opacity-50"
                style={{ background: '#409eff', color: '#fff', border: 'none' }}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 选择居民弹窗 */}
      {showSelectResidentModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#e4e7ed' }}>
              <span className="text-lg font-medium" style={{ color: '#303133' }}>选择居民</span>
              <button
                type="button"
                onClick={() => setShowSelectResidentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              {/* 搜索条件 */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <span className="text-sm whitespace-nowrap" style={{ color: '#606266' }}>姓名</span>
                  <input
                    type="text"
                    placeholder="姓名"
                    value={searchResidentParams.full_name}
                    onChange={(e) => setSearchResidentParams(prev => ({ ...prev, full_name: e.target.value }))}
                    className="flex-1 rounded text-sm px-2.5 py-1.5 focus:outline-none"
                    style={{ border: '1px solid #dcdfe6', background: '#fff', color: '#303133' }}
                  />
                </div>
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <span className="text-sm whitespace-nowrap" style={{ color: '#606266' }}>身份证号</span>
                  <input
                    type="text"
                    placeholder="身份证号"
                    value={searchResidentParams.identity_number}
                    onChange={(e) => setSearchResidentParams(prev => ({ ...prev, identity_number: e.target.value }))}
                    className="flex-1 rounded text-sm px-2.5 py-1.5 focus:outline-none"
                    style={{ border: '1px solid #dcdfe6', background: '#fff', color: '#303133' }}
                  />
                </div>
                <div className="flex items-center gap-2 min-w-[120px]">
                  <span className="text-sm whitespace-nowrap" style={{ color: '#606266' }}>村组</span>
                  <div className="relative" style={{ width: 100 }}>
                    <select
                      value={searchResidentParams.village_group}
                      onChange={(e) => setSearchResidentParams(prev => ({ ...prev, village_group: e.target.value }))}
                      className="w-full rounded text-sm px-2.5 py-1.5 focus:outline-none appearance-none pr-6"
                      style={{
                        border: '1px solid #dcdfe6',
                        background: '#fff',
                        color: searchResidentParams.village_group ? '#303133' : '#c0c4cc',
                      }}
                    >
                      <option value="">村组</option>
                      {villageGroups.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                    <ChevronDown
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ width: 12, height: 12, color: '#c0c4cc' }}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={searchResidents}
                  className="rounded text-sm px-4 py-2"
                  style={{ background: '#409eff', color: '#fff', border: 'none' }}
                >
                  查询
                </button>
              </div>

              {/* 居民列表 */}
              <div className="overflow-x-auto" style={{ border: '1px solid #e4e7ed', borderRadius: 4 }}>
                <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#fafafa' }}>
                      <th className="px-3 py-2.5 text-left whitespace-nowrap" style={{ borderBottom: '1px solid #e4e7ed', color: '#606266', fontWeight: 500, fontSize: 13 }}>
                        序号
                      </th>
                      <th className="px-3 py-2.5 text-left whitespace-nowrap" style={{ borderBottom: '1px solid #e4e7ed', color: '#606266', fontWeight: 500, fontSize: 13 }}>
                        姓名
                      </th>
                      <th className="px-3 py-2.5 text-left whitespace-nowrap" style={{ borderBottom: '1px solid #e4e7ed', color: '#606266', fontWeight: 500, fontSize: 13 }}>
                        性别
                      </th>
                      <th className="px-3 py-2.5 text-left whitespace-nowrap" style={{ borderBottom: '1px solid #e4e7ed', color: '#606266', fontWeight: 500, fontSize: 13 }}>
                        民族
                      </th>
                      <th className="px-3 py-2.5 text-left whitespace-nowrap" style={{ borderBottom: '1px solid #e4e7ed', color: '#606266', fontWeight: 500, fontSize: 13 }}>
                        身份证号
                      </th>
                      <th className="px-3 py-2.5 text-left whitespace-nowrap" style={{ borderBottom: '1px solid #e4e7ed', color: '#606266', fontWeight: 500, fontSize: 13 }}>
                        组别
                      </th>
                      <th className="px-3 py-2.5 text-left whitespace-nowrap" style={{ borderBottom: '1px solid #e4e7ed', color: '#606266', fontWeight: 500, fontSize: 13 }}>
                        电话
                      </th>
                      <th className="px-3 py-2.5 text-left whitespace-nowrap" style={{ borderBottom: '1px solid #e4e7ed', color: '#606266', fontWeight: 500, fontSize: 13 }}>
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {residentsLoading ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center" style={{ color: '#909399', fontSize: 13 }}>
                          加载中...
                        </td>
                      </tr>
                    ) : residents.length > 0 ? (
                      residents.map((resident, idx) => (
                        <tr key={resident.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #e4e7ed' }}>
                            {idx + 1}
                          </td>
                          <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #e4e7ed' }}>
                            {resident.full_name}
                          </td>
                          <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #e4e7ed' }}>
                            {resident.gender}
                          </td>
                          <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #e4e7ed' }}>
                            -
                          </td>
                          <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #e4e7ed' }}>
                            {resident.identity_number}
                          </td>
                          <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #e4e7ed' }}>
                            {resident.village_group || '-'}
                          </td>
                          <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #e4e7ed' }}>
                            {resident.phone || '-'}
                          </td>
                          <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #e4e7ed' }}>
                            <button
                              type="button"
                              onClick={() => handleSelectResident(resident)}
                              className="text-sm text-blue-500 hover:text-blue-700"
                            >
                              加入务工人员
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="py-8 text-center" style={{ color: '#909399', fontSize: 13 }}>
                          暂无数据，请先搜索
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="text-xs" style={{ color: '#909399' }}>
                单次查询最多显示20条记录，超出部分请继续缩小条件后再查。
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
