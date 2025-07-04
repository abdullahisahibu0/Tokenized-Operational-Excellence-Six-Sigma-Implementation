import { describe, it, expect, beforeEach } from 'vitest'

// Mock project data
const mockProjects = {}
const mockPhaseCompletions = {}
let projectCounter = 0

// Constants
const PHASE_DEFINE = 1
const PHASE_MEASURE = 2
const PHASE_ANALYZE = 3
const PHASE_IMPROVE = 4
const PHASE_CONTROL = 5

// Mock contract functions
const mockProjectContract = {
  createProject: (coordinator: string, title: string, targetCompletion: number, qualityTarget: number, defectReductionTarget: number) => {
    const projectId = ++projectCounter
    
    mockProjects[projectId] = {
      coordinator,
      title,
      'current-phase': PHASE_DEFINE,
      'start-date': Date.now(),
      'target-completion': targetCompletion,
      'quality-baseline': 0,
      'quality-target': qualityTarget,
      'defect-reduction-target': defectReductionTarget,
      'is-completed': false,
      'tokens-earned': 0
    }
    
    return { success: true, projectId }
  },
  
  completePhase: (projectId: number, phase: number, qualityMetric: number, notes: string) => {
    const project = mockProjects[projectId]
    if (!project) {
      return { success: false, error: 'ERR-PROJECT-NOT-FOUND' }
    }
    
    if (phase > PHASE_CONTROL) {
      return { success: false, error: 'ERR-INVALID-PHASE' }
    }
    
    // Record phase completion
    mockPhaseCompletions[`${projectId}-${phase}`] = {
      'completion-date': Date.now(),
      'quality-metric': qualityMetric,
      notes
    }
    
    // Update project phase
    if (phase < PHASE_CONTROL) {
      project['current-phase'] = phase + 1
    } else {
      project['current-phase'] = phase
      project['is-completed'] = true
    }
    
    return { success: true }
  },
  
  getProject: (projectId: number) => {
    return mockProjects[projectId] || null
  },
  
  getPhaseCompletion: (projectId: number, phase: number) => {
    return mockPhaseCompletions[`${projectId}-${phase}`] || null
  },
  
  getProjectProgress: (projectId: number) => {
    const project = mockProjects[projectId]
    if (!project) return 0
    
    if (project['is-completed']) {
      return 100
    }
    
    return (project['current-phase'] - 1) * 20
  },
  
  awardProjectTokens: (projectId: number, tokenAmount: number) => {
    const project = mockProjects[projectId]
    if (!project) {
      return { success: false, error: 'ERR-PROJECT-NOT-FOUND' }
    }
    
    project['tokens-earned'] = tokenAmount
    return { success: true }
  }
}

describe('Project Tracking System', () => {
  beforeEach(() => {
    // Reset mock data
    Object.keys(mockProjects).forEach(key => delete mockProjects[key])
    Object.keys(mockPhaseCompletions).forEach(key => delete mockPhaseCompletions[key])
    projectCounter = 0
  })
  
  describe('Project Creation', () => {
    it('should successfully create a new Six Sigma project', () => {
      const result = mockProjectContract.createProject(
          'SP1234567890',
          'Reduce Manufacturing Defects',
          Date.now() + 90 * 24 * 60 * 60 * 1000, // 90 days from now
          95, // 95% quality target
          50  // 50% defect reduction target
      )
      
      expect(result.success).toBe(true)
      expect(result.projectId).toBe(1)
      
      const project = mockProjectContract.getProject(1)
      expect(project).toBeTruthy()
      expect(project.title).toBe('Reduce Manufacturing Defects')
      expect(project['current-phase']).toBe(PHASE_DEFINE)
      expect(project['is-completed']).toBe(false)
    })
    
    it('should initialize project with correct default values', () => {
      const result = mockProjectContract.createProject(
          'SP1234567890',
          'Process Improvement Initiative',
          Date.now() + 60 * 24 * 60 * 60 * 1000,
          90,
          30
      )
      
      const project = mockProjectContract.getProject(result.projectId)
      expect(project['quality-baseline']).toBe(0)
      expect(project['tokens-earned']).toBe(0)
      expect(project['current-phase']).toBe(PHASE_DEFINE)
    })
  })
  
  describe('Phase Management', () => {
    let projectId: number
    
    beforeEach(() => {
      const result = mockProjectContract.createProject(
          'SP1234567890',
          'Test Project',
          Date.now() + 90 * 24 * 60 * 60 * 1000,
          85,
          40
      )
      projectId = result.projectId
    })
    
    it('should complete Define phase and advance to Measure', () => {
      const result = mockProjectContract.completePhase(
          projectId,
          PHASE_DEFINE,
          75,
          'Problem definition completed with stakeholder alignment'
      )
      
      expect(result.success).toBe(true)
      
      const project = mockProjectContract.getProject(projectId)
      expect(project['current-phase']).toBe(PHASE_MEASURE)
      
      const phaseCompletion = mockProjectContract.getPhaseCompletion(projectId, PHASE_DEFINE)
      expect(phaseCompletion).toBeTruthy()
      expect(phaseCompletion['quality-metric']).toBe(75)
    })
    
    it('should complete all phases in sequence', () => {
      const phases = [
        { phase: PHASE_DEFINE, metric: 75, notes: 'Define phase completed' },
        { phase: PHASE_MEASURE, metric: 78, notes: 'Baseline measurements taken' },
        { phase: PHASE_ANALYZE, metric: 82, notes: 'Root cause analysis completed' },
        { phase: PHASE_IMPROVE, metric: 88, notes: 'Improvements implemented' },
        { phase: PHASE_CONTROL, metric: 92, notes: 'Control measures established' }
      ]
      
      phases.forEach(({ phase, metric, notes }) => {
        const result = mockProjectContract.completePhase(projectId, phase, metric, notes)
        expect(result.success).toBe(true)
      })
      
      const project = mockProjectContract.getProject(projectId)
      expect(project['is-completed']).toBe(true)
      expect(project['current-phase']).toBe(PHASE_CONTROL)
    })
    
    it('should reject completion of invalid phase', () => {
      const result = mockProjectContract.completePhase(projectId, 10, 80, 'Invalid phase')
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('ERR-INVALID-PHASE')
    })
    
    it('should reject phase completion for non-existent project', () => {
      const result = mockProjectContract.completePhase(999, PHASE_DEFINE, 80, 'Test notes')
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('ERR-PROJECT-NOT-FOUND')
    })
  })
  
  describe('Progress Tracking', () => {
    let projectId: number
    
    beforeEach(() => {
      const result = mockProjectContract.createProject(
          'SP1234567890',
          'Progress Test Project',
          Date.now() + 90 * 24 * 60 * 60 * 1000,
          85,
          40
      )
      projectId = result.projectId
    })
    
    it('should calculate correct progress percentage for each phase', () => {
      // Initial progress (Define phase)
      expect(mockProjectContract.getProjectProgress(projectId)).toBe(0)
      
      // Complete Define phase
      mockProjectContract.completePhase(projectId, PHASE_DEFINE, 75, 'Define completed')
      expect(mockProjectContract.getProjectProgress(projectId)).toBe(20)
      
      // Complete Measure phase
      mockProjectContract.completePhase(projectId, PHASE_MEASURE, 78, 'Measure completed')
      expect(mockProjectContract.getProjectProgress(projectId)).toBe(40)
      
      // Complete Analyze phase
      mockProjectContract.completePhase(projectId, PHASE_ANALYZE, 82, 'Analyze completed')
      expect(mockProjectContract.getProjectProgress(projectId)).toBe(60)
      
      // Complete Improve phase
      mockProjectContract.completePhase(projectId, PHASE_IMPROVE, 88, 'Improve completed')
      expect(mockProjectContract.getProjectProgress(projectId)).toBe(80)
      
      // Complete Control phase
      mockProjectContract.completePhase(projectId, PHASE_CONTROL, 92, 'Control completed')
      expect(mockProjectContract.getProjectProgress(projectId)).toBe(100)
    })
    
    it('should return 0 progress for non-existent project', () => {
      expect(mockProjectContract.getProjectProgress(999)).toBe(0)
    })
  })
  
  describe('Token Management', () => {
    let projectId: number
    
    beforeEach(() => {
      const result = mockProjectContract.createProject(
          'SP1234567890',
          'Token Test Project',
          Date.now() + 90 * 24 * 60 * 60 * 1000,
          85,
          40
      )
      projectId = result.projectId
    })
    
    it('should successfully award tokens to completed project', () => {
      const result = mockProjectContract.awardProjectTokens(projectId, 1000)
      
      expect(result.success).toBe(true)
      
      const project = mockProjectContract.getProject(projectId)
      expect(project['tokens-earned']).toBe(1000)
    })
    
    it('should reject token award for non-existent project', () => {
      const result = mockProjectContract.awardProjectTokens(999, 1000)
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('ERR-PROJECT-NOT-FOUND')
    })
    
    it('should allow token amount updates', () => {
      mockProjectContract.awardProjectTokens(projectId, 500)
      mockProjectContract.awardProjectTokens(projectId, 1500)
      
      const project = mockProjectContract.getProject(projectId)
      expect(project['tokens-earned']).toBe(1500)
    })
  })
  
  describe('Data Integrity', () => {
    it('should maintain project data consistency across operations', () => {
      const result = mockProjectContract.createProject(
          'SP1234567890',
          'Consistency Test Project',
          Date.now() + 90 * 24 * 60 * 60 * 1000,
          90,
          45
      )
      const projectId = result.projectId
      
      // Complete a phase
      mockProjectContract.completePhase(projectId, PHASE_DEFINE, 80, 'Phase completed')
      
      // Award tokens
      mockProjectContract.awardProjectTokens(projectId, 750)
      
      const project = mockProjectContract.getProject(projectId)
      
      // Verify all data is maintained correctly
      expect(project.title).toBe('Consistency Test Project')
      expect(project.coordinator).toBe('SP1234567890')
      expect(project['quality-target']).toBe(90)
      expect(project['defect-reduction-target']).toBe(45)
      expect(project['current-phase']).toBe(PHASE_MEASURE)
      expect(project['tokens-earned']).toBe(750)
      expect(project['is-completed']).toBe(false)
    })
  })
})
