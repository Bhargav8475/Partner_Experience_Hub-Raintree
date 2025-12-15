import { useState, useEffect, useRef } from 'react'
import { CheckCircle, X, Loader2, Building2, Calendar, DollarSign, TrendingUp, Users, Briefcase, LogOut, AlertCircle, Edit, Trash2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Sidebar, SidebarHeader, SidebarContent, SidebarItem, SidebarFooter } from '@/components/ui/sidebar'
import { salesforceAPI } from '@/services/salesforce'

// Types
interface Opportunity {
  id: string
  name: string
  stage: string
  amount: number
  closeDate: string
  synced: boolean
  raintreeOpportunityId?: string // ID of the opportunity in Raintree Salesforce (if synced)
  lastModifiedDate?: string // For change detection
}

interface Lead {
  id: string
  firstName: string
  lastName: string
  company: string
  email: string
  status: string
  synced: boolean
  raintreeLeadId?: string // ID of the lead in Raintree Salesforce (if synced)
  lastModifiedDate?: string // For change detection
}

function App() {
  // State Management
  const [step, setStep] = useState<number>(1)
  const [email, setEmail] = useState<string>('demo@example.com')
  const [password, setPassword] = useState<string>('password123')
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false)
  const [salesforceUsername, setSalesforceUsername] = useState<string>('priyatham@dataskate.io')
  const [salesforcePassword, setSalesforcePassword] = useState<string>('IhaveNOpassword@369')
  const [salesforceToken, setSalesforceToken] = useState<string>('TcFg3Y5X4kKyjaqNAo0QHJzgA')
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false)
  const [showSuccess, setShowSuccess] = useState<boolean>(false)
  const [showOpportunityModal, setShowOpportunityModal] = useState<boolean>(false)
  const [showEditOpportunityModal, setShowEditOpportunityModal] = useState<boolean>(false)
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null)
  const [showLeadModal, setShowLeadModal] = useState<boolean>(false)
  const [showEditLeadModal, setShowEditLeadModal] = useState<boolean>(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [activeSection, setActiveSection] = useState<'opportunities' | 'leads'>('opportunities')
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState<boolean>(false)
  const [isUpdating, setIsUpdating] = useState<boolean>(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isPolling, setIsPolling] = useState<boolean>(false)
  const [syncNotifications, setSyncNotifications] = useState<Array<{id: string, message: string, type: 'success' | 'error' | 'info'}>>([])
  
  // Refs to store current values for polling without causing re-renders
  const opportunitiesRef = useRef<Opportunity[]>([])
  const leadsRef = useRef<Lead[]>([])
  
  // Keep refs in sync with state
  useEffect(() => {
    opportunitiesRef.current = opportunities
  }, [opportunities])
  
  useEffect(() => {
    leadsRef.current = leads
  }, [leads])
  
  // Opportunity form state
  const [oppName, setOppName] = useState<string>('')
  const [oppStage, setOppStage] = useState<string>('Prospecting')
  const [oppAmount, setOppAmount] = useState<string>('')
  const [oppCloseDate, setOppCloseDate] = useState<string>('')
  const [syncToRaintree, setSyncToRaintree] = useState<boolean>(false)
  
  // Edit opportunity form state
  const [editOppName, setEditOppName] = useState<string>('')
  const [editOppStage, setEditOppStage] = useState<string>('Prospecting')
  const [editOppAmount, setEditOppAmount] = useState<string>('')
  const [editOppCloseDate, setEditOppCloseDate] = useState<string>('')
  const [editSyncToRaintree, setEditSyncToRaintree] = useState<boolean>(false)

  // Lead form state
  const [leadFirstName, setLeadFirstName] = useState<string>('')
  const [leadLastName, setLeadLastName] = useState<string>('')
  const [leadCompany, setLeadCompany] = useState<string>('')
  const [leadEmail, setLeadEmail] = useState<string>('')
  const [leadStatus, setLeadStatus] = useState<string>('Open - Not Contacted')
  const [syncLeadToRaintree, setSyncLeadToRaintree] = useState<boolean>(false)
  
  // Edit lead form state
  const [editLeadFirstName, setEditLeadFirstName] = useState<string>('')
  const [editLeadLastName, setEditLeadLastName] = useState<string>('')
  const [editLeadCompany, setEditLeadCompany] = useState<string>('')
  const [editLeadEmail, setEditLeadEmail] = useState<string>('')
  const [editLeadStatus, setEditLeadStatus] = useState<string>('Open - Not Contacted')
  const [editSyncLeadToRaintree, setEditSyncLeadToRaintree] = useState<boolean>(false)

  // Step 1: Handle Login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setStep(2)
  }

  // Step 2: Handle Salesforce Authentication
  const handleSalesforceAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAuthenticating(true)
    setShowSuccess(false)
    setError(null)

    try {
      await salesforceAPI.authenticate(salesforceUsername, salesforcePassword, salesforceToken)
      setIsAuthenticating(false)
      setShowSuccess(true)

      // Move to dashboard after showing success
      setTimeout(() => {
        setShowAuthModal(false)
        setStep(3)
        setShowSuccess(false)
        // Load initial data from Salesforce
        loadSalesforceData()
      }, 1500)
    } catch (err: any) {
      setIsAuthenticating(false)
      setError(err.message || 'Failed to authenticate with Salesforce. Please check your credentials.')
      console.error('Authentication error:', err)
    }
  }

  // Load data from Salesforce
  const loadSalesforceData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [sfOpportunities, sfLeads] = await Promise.all([
        salesforceAPI.getOpportunities(),
        salesforceAPI.getLeads()
      ])

      // Load opportunity mappings from localStorage
      const mappings = JSON.parse(localStorage.getItem('opportunity_mappings') || '{}')
      console.log('📋 Loaded opportunity mappings from localStorage:', mappings)
      
      // Transform Salesforce opportunities to our format
      const transformedOpps: Opportunity[] = sfOpportunities.map((opp: any) => {
        const mapping = mappings[opp.Id]
        // Handle both simple format (string) and enhanced format (object)
        const raintreeId = typeof mapping === 'string' ? mapping : mapping?.raintreeId
        if (raintreeId) {
          console.log(`✅ Found Raintree mapping for opportunity ${opp.Id}: ${raintreeId}`)
        }
        return {
          id: opp.Id,
          name: opp.Name,
          stage: opp.StageName,
          amount: opp.Amount || 0,
          closeDate: opp.CloseDate,
          synced: !!raintreeId, // Set synced to true only if we have a Raintree ID
          raintreeOpportunityId: raintreeId,
          lastModifiedDate: opp.LastModifiedDate
        }
      })
      
      console.log('📊 Transformed opportunities:', transformedOpps.map(opp => ({
        id: opp.id,
        name: opp.name,
        synced: opp.synced,
        raintreeId: opp.raintreeOpportunityId
      })))

      // Load lead mappings from localStorage
      const leadMappings = JSON.parse(localStorage.getItem('lead_mappings') || '{}')
      console.log('📋 Loaded lead mappings from localStorage:', leadMappings)
      
      // Transform Salesforce leads to our format
      const transformedLeads: Lead[] = sfLeads.map((lead: any) => {
        const mapping = leadMappings[lead.Id]
        // Handle both simple format (string) and enhanced format (object)
        const raintreeId = typeof mapping === 'string' ? mapping : mapping?.raintreeId
        if (raintreeId) {
          console.log(`✅ Found Raintree mapping for lead ${lead.Id}: ${raintreeId}`)
        }
        return {
          id: lead.Id,
          firstName: lead.FirstName || '',
          lastName: lead.LastName || '',
          company: lead.Company || '',
          email: lead.Email || '',
          status: lead.Status || 'Open - Not Contacted',
          synced: !!raintreeId, // Set synced to true only if we have a Raintree ID
          raintreeLeadId: raintreeId,
          lastModifiedDate: lead.LastModifiedDate
        }
      })
      
      console.log('📊 Transformed leads:', transformedLeads.map(lead => ({
        id: lead.id,
        name: `${lead.firstName} ${lead.lastName}`,
        synced: lead.synced,
        raintreeId: lead.raintreeLeadId
      })))

      setOpportunities(transformedOpps)
      setLeads(transformedLeads)
    } catch (err: any) {
      setError(err.message || 'Failed to load data from Salesforce')
      console.error('Error loading data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Detect changes and perform bi-directional sync using backend
  const detectAndSyncChanges = async () => {
    if (isPolling || step !== 3) return
    
    setIsPolling(true)
    try {
      const syncResults = await salesforceAPI.detectAndSyncChanges()
      
      let hasChanges = false
      
      // Show notifications for synced records
      syncResults.opportunities.forEach(result => {
        if (result.success && result.syncDirection !== 'none') {
          hasChanges = true
          const direction = result.syncDirection === 'partner-to-raintree' 
            ? 'Partner → Raintree' 
            : result.syncDirection === 'raintree-to-partner'
            ? 'Raintree → Partner'
            : 'Conflict resolved'
          addNotification(`${result.recordName} synced (${direction})`, 'success')
        } else if (!result.success) {
          addNotification(`Failed to sync ${result.recordName}: ${result.error}`, 'error')
        }
      })

      syncResults.leads.forEach(result => {
        if (result.success && result.syncDirection !== 'none') {
          hasChanges = true
          const direction = result.syncDirection === 'partner-to-raintree' 
            ? 'Partner → Raintree' 
            : result.syncDirection === 'raintree-to-partner'
            ? 'Raintree → Partner'
            : 'Conflict resolved'
          addNotification(`${result.recordName} synced (${direction})`, 'success')
        } else if (!result.success) {
          addNotification(`Failed to sync ${result.recordName}: ${result.error}`, 'error')
        }
      })

      // Reload data only if there were actual syncs
      if (hasChanges) {
        await loadSalesforceData()
      }
    } catch (err: any) {
      console.error('Error syncing:', err)
      addNotification(`Sync error: ${err.message}`, 'error')
    } finally {
      setIsPolling(false)
    }
  }

  // Add notification
  const addNotification = (message: string, type: 'success' | 'error' | 'info') => {
    const id = Date.now().toString()
    setSyncNotifications(prev => [...prev, { id, message, type }])
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setSyncNotifications(prev => prev.filter(n => n.id !== id))
    }, 5000)
  }

  // Load data when dashboard is accessed
  useEffect(() => {
    if (step === 3) {
      loadSalesforceData()
    }
  }, [step])

  // Poll for changes every 10 seconds when on dashboard
  useEffect(() => {
    if (step !== 3) return

    // Initial poll after 5 seconds
    const initialTimeout = setTimeout(() => {
      detectAndSyncChanges()
    }, 5000)

    // Then poll every 10 seconds
    const pollInterval = setInterval(() => {
      detectAndSyncChanges()
    }, 10000)

    return () => {
      clearTimeout(initialTimeout)
      clearInterval(pollInterval)
    }
  }, [step]) // Only depend on step, not opportunities/leads to avoid infinite loops

  // Step 3: Handle Opportunity Creation
  const handleCreateOpportunity = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)
    setError(null)

    try {
      // Always sync to Salesforce (the toggle is for Raintree sync)
      // Get the full response to check for Raintree ID
      const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3001'
      const credentials = {
        email: localStorage.getItem('salesforce_username') || '',
        password: localStorage.getItem('salesforce_password') || '',
        securityToken: localStorage.getItem('salesforce_token') || ''
      }

      const response = await fetch(`${API_BASE_URL}/api/opportunities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunity: {
            Name: oppName,
            StageName: oppStage,
            Amount: parseFloat(oppAmount) || 0,
            CloseDate: oppCloseDate
          },
          partnerCredentials: credentials,
          syncToRaintree: syncToRaintree
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || errorData.error || 'Failed to create opportunity')
      }

      const responseData = await response.json()
      const salesforceId = responseData.data?.partnerSalesforceId

      if (!salesforceId) {
        throw new Error('No opportunity ID returned from server')
      }

      const raintreeId = responseData.data?.raintreeSalesforceId
      
      console.log('📦 Create opportunity response:', {
        salesforceId,
        raintreeId,
        syncToRaintree,
        fullResponse: responseData
      })
      
      // Store the mapping in localStorage for persistence (enhanced format)
      if (raintreeId) {
        const mappings = JSON.parse(localStorage.getItem('opportunity_mappings') || '{}')
        const now = new Date().toISOString()
        mappings[salesforceId] = {
          partnerId: salesforceId,
          raintreeId: raintreeId,
          partnerLastModified: now,
          raintreeLastModified: now,
          lastSyncSource: 'system',
          lastSyncTime: now
        }
        localStorage.setItem('opportunity_mappings', JSON.stringify(mappings))
        console.log('💾 Stored opportunity mapping (enhanced format):', { partnerId: salesforceId, raintreeId })
      } else if (syncToRaintree) {
        console.warn('⚠️ Raintree sync was enabled but no raintreeSalesforceId was returned')
        console.warn('   Response data:', responseData.data)
      }

      const newOpportunity: Opportunity = {
        id: salesforceId,
        name: oppName,
        stage: oppStage,
        amount: parseFloat(oppAmount) || 0,
        closeDate: oppCloseDate,
        synced: syncToRaintree,
        raintreeOpportunityId: raintreeId
      }

      setOpportunities([...opportunities, newOpportunity])
      
      // Reset form
      setOppName('')
      setOppStage('Prospecting')
      setOppAmount('')
      setOppCloseDate('')
      setSyncToRaintree(false)
      setShowOpportunityModal(false)
    } catch (err: any) {
      setError(err.message || 'Failed to create opportunity in Salesforce')
      console.error('Error creating opportunity:', err)
    } finally {
      setIsCreating(false)
    }
  }

  // Handle Opportunity Edit
  const handleEditOpportunity = (opp: Opportunity) => {
    // Only allow editing if synced
    if (!opp.synced) {
      setError('Only opportunities synced to Raintree can be edited')
      return
    }
    setEditingOpportunity(opp)
    setEditOppName(opp.name)
    setEditOppStage(opp.stage)
    setEditOppAmount(opp.amount.toString())
    setEditOppCloseDate(opp.closeDate)
    setEditSyncToRaintree(opp.synced || false)
    setShowEditOpportunityModal(true)
  }

  // Handle Opportunity Update
  const handleUpdateOpportunity = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingOpportunity) return

    setIsUpdating(true)
    setError(null)

    try {
      await salesforceAPI.updateOpportunity(
        editingOpportunity.id,
        {
          Name: editOppName,
          StageName: editOppStage,
          Amount: parseFloat(editOppAmount) || 0,
          CloseDate: editOppCloseDate
        },
        editSyncToRaintree,
        editingOpportunity.raintreeOpportunityId
      )

      // Update the opportunity in the list
      const updatedOpportunity = {
        ...editingOpportunity,
        name: editOppName,
        stage: editOppStage,
        amount: parseFloat(editOppAmount) || 0,
        closeDate: editOppCloseDate,
        synced: editSyncToRaintree,
        // Preserve raintreeOpportunityId if it exists
        raintreeOpportunityId: editingOpportunity.raintreeOpportunityId
      }
      
      setOpportunities(opportunities.map(opp => 
        opp.id === editingOpportunity.id ? updatedOpportunity : opp
      ))

      // Reset form and close modal
      setEditingOpportunity(null)
      setEditOppName('')
      setEditOppStage('Prospecting')
      setEditOppAmount('')
      setEditOppCloseDate('')
      setEditSyncToRaintree(false)
      setShowEditOpportunityModal(false)
    } catch (err: any) {
      setError(err.message || 'Failed to update opportunity')
      console.error('Error updating opportunity:', err)
    } finally {
      setIsUpdating(false)
    }
  }

  // Handle Opportunity Delete
  const handleDeleteOpportunity = async (opp: Opportunity) => {
    // Only allow deleting if synced
    if (!opp.synced) {
      setError('Only opportunities synced to Raintree can be deleted')
      return
    }
    
    if (!confirm(`Are you sure you want to delete "${opp.name}"? This action cannot be undone.`)) {
      return
    }

    setIsDeleting(opp.id)
    setError(null)

    try {
      await salesforceAPI.deleteOpportunity(
        opp.id,
        opp.synced || false,
        opp.raintreeOpportunityId
      )

      // Remove the opportunity from the list
      setOpportunities(opportunities.filter(o => o.id !== opp.id))
    } catch (err: any) {
      setError(err.message || 'Failed to delete opportunity')
      console.error('Error deleting opportunity:', err)
    } finally {
      setIsDeleting(null)
    }
  }

  // Handle Lead Creation
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)
    setError(null)

    try {
      // Always sync to Salesforce (the toggle is for Raintree sync)
      // Get the full response to check for Raintree ID
      const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3001'
      const credentials = {
        email: localStorage.getItem('salesforce_username') || '',
        password: localStorage.getItem('salesforce_password') || '',
        securityToken: localStorage.getItem('salesforce_token') || ''
      }

      const response = await fetch(`${API_BASE_URL}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead: {
            FirstName: leadFirstName,
            LastName: leadLastName,
            Company: leadCompany,
            Email: leadEmail,
            Status: leadStatus
          },
          partnerCredentials: credentials,
          syncToRaintree: syncLeadToRaintree
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || errorData.error || 'Failed to create lead')
      }

      const responseData = await response.json()
      const salesforceId = responseData.data?.partnerSalesforceId

      if (!salesforceId) {
        throw new Error('No lead ID returned from server')
      }

      const raintreeId = responseData.data?.raintreeSalesforceId
      
      console.log('📦 Create lead response:', {
        salesforceId,
        raintreeId,
        syncLeadToRaintree,
        fullResponse: responseData
      })
      
      // Store the mapping in localStorage for persistence (enhanced format)
      if (raintreeId) {
        const mappings = JSON.parse(localStorage.getItem('lead_mappings') || '{}')
        const now = new Date().toISOString()
        mappings[salesforceId] = {
          partnerId: salesforceId,
          raintreeId: raintreeId,
          partnerLastModified: now,
          raintreeLastModified: now,
          lastSyncSource: 'system',
          lastSyncTime: now
        }
        localStorage.setItem('lead_mappings', JSON.stringify(mappings))
        console.log('💾 Stored lead mapping (enhanced format):', { partnerId: salesforceId, raintreeId })
      } else if (syncLeadToRaintree) {
        console.warn('⚠️ Raintree sync was enabled but no raintreeSalesforceId was returned')
        console.warn('   Response data:', responseData.data)
      }

      const newLead: Lead = {
        id: salesforceId,
        firstName: leadFirstName,
        lastName: leadLastName,
        company: leadCompany,
        email: leadEmail,
        status: leadStatus,
        synced: syncLeadToRaintree,
        raintreeLeadId: raintreeId
      }

      setLeads([...leads, newLead])
      
      // Reset form
      setLeadFirstName('')
      setLeadLastName('')
      setLeadCompany('')
      setLeadEmail('')
      setLeadStatus('Open - Not Contacted')
      setSyncLeadToRaintree(false)
      setShowLeadModal(false)
    } catch (err: any) {
      setError(err.message || 'Failed to create lead in Salesforce')
      console.error('Error creating lead:', err)
    } finally {
      setIsCreating(false)
    }
  }

  // Handle Lead Edit
  const handleEditLead = (lead: Lead) => {
    // Only allow editing if synced
    if (!lead.synced) {
      setError('Only leads synced to Raintree can be edited')
      return
    }
    setEditingLead(lead)
    setEditLeadFirstName(lead.firstName)
    setEditLeadLastName(lead.lastName)
    setEditLeadCompany(lead.company)
    setEditLeadEmail(lead.email)
    setEditLeadStatus(lead.status)
    setEditSyncLeadToRaintree(lead.synced || false)
    setShowEditLeadModal(true)
  }

  // Handle Lead Update
  const handleUpdateLead = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingLead) return

    setIsUpdating(true)
    setError(null)

    try {
      await salesforceAPI.updateLead(
        editingLead.id,
        {
          FirstName: editLeadFirstName,
          LastName: editLeadLastName,
          Company: editLeadCompany,
          Email: editLeadEmail,
          Status: editLeadStatus
        },
        editSyncLeadToRaintree,
        editingLead.raintreeLeadId
      )

      // Update the lead in the list
      const updatedLead = {
        ...editingLead,
        firstName: editLeadFirstName,
        lastName: editLeadLastName,
        company: editLeadCompany,
        email: editLeadEmail,
        status: editLeadStatus,
        synced: editSyncLeadToRaintree,
        // Preserve raintreeLeadId if it exists
        raintreeLeadId: editingLead.raintreeLeadId
      }
      
      setLeads(leads.map(lead => 
        lead.id === editingLead.id ? updatedLead : lead
      ))

      // Reset form and close modal
      setEditingLead(null)
      setEditLeadFirstName('')
      setEditLeadLastName('')
      setEditLeadCompany('')
      setEditLeadEmail('')
      setEditLeadStatus('Open - Not Contacted')
      setEditSyncLeadToRaintree(false)
      setShowEditLeadModal(false)
    } catch (err: any) {
      setError(err.message || 'Failed to update lead')
      console.error('Error updating lead:', err)
    } finally {
      setIsUpdating(false)
    }
  }

  // Handle Lead Delete
  const handleDeleteLead = async (lead: Lead) => {
    // Only allow deleting if synced
    if (!lead.synced) {
      setError('Only leads synced to Raintree can be deleted')
      return
    }
    
    if (!confirm(`Are you sure you want to delete "${lead.firstName} ${lead.lastName}"? This action cannot be undone.`)) {
      return
    }

    setIsDeleting(lead.id)
    setError(null)

    try {
      await salesforceAPI.deleteLead(
        lead.id,
        lead.synced || false,
        lead.raintreeLeadId
      )

      // Remove the lead from the list
      setLeads(leads.filter(l => l.id !== lead.id))
      
      // Remove from localStorage mapping
      const mappings = JSON.parse(localStorage.getItem('lead_mappings') || '{}')
      delete mappings[lead.id]
      localStorage.setItem('lead_mappings', JSON.stringify(mappings))
    } catch (err: any) {
      setError(err.message || 'Failed to delete lead')
      console.error('Error deleting lead:', err)
    } finally {
      setIsDeleting(null)
    }
  }


  return (
    <div className="min-h-screen bg-gray-50">

      {/* Step 1: Login Screen */}
      {step === 1 && (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#fafaf9]">
          <Card className="w-full max-w-md border-gray-100 shadow-sm">
            <CardHeader className="space-y-1 text-center pb-6">
              <div className="flex justify-center mb-6">
                <img src="/image.png" alt="Raintree Systems" className="h-14 object-contain"/>
              </div>
              <CardTitle className="text-2xl font-semibold mb-1 text-gray-900">Partner Experience Hub</CardTitle>
              <CardDescription className="text-sm text-gray-500">
                Powered by Raintree Systems
              </CardDescription>
              <div className="mt-8 pt-6 border-t border-gray-100">
                <CardTitle className="text-lg font-semibold mb-1 text-gray-900">Sign in</CardTitle>
                <CardDescription className="text-sm">
                  Enter your credentials to access your account
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="demo@example.com"
                    className="border-gray-200 focus:border-[#0176D3] focus:ring-[#0176D3]"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter your password"
                    className="border-gray-200 focus:border-[#0176D3] focus:ring-[#0176D3]"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-[#0176D3] hover:bg-[#0160A3] text-white shadow-sm"
                >
                  Sign in
                </Button>
                
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2: CRM Selection */}
      {step === 2 && (
        <div className="min-h-screen py-16 px-6 bg-[#fafaf9]">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                Connect your CRM to start syncing
              </h1>
              <p className="text-sm text-gray-500">
                Select your source of truth to begin synchronizing opportunities
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
              {/* Salesforce Card - Primary */}
              <div
                onClick={() => setShowAuthModal(true)}
                className="bg-white rounded-md border-2 border-[#0176D3] p-6 cursor-pointer hover:shadow-md transition-all relative"
              >
                <div className="absolute top-3 right-3 bg-[#0176D3] text-white px-2 py-0.5 text-xs font-medium rounded">
                  RECOMMENDED
                </div>
                <div className="flex flex-col items-center text-center pt-2">
                  <div className="w-16 h-16 bg-white rounded flex items-center justify-center mb-4 p-2">
                    <img 
                      src="/salesforce-logo.png" 
                      alt="Salesforce" 
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Salesforce</h3>
                  <p className="text-sm text-gray-500 mb-6">
                    Connect your Salesforce organization to sync opportunities
                  </p>
                  <button className="w-full bg-[#0176D3] text-white py-2 rounded text-sm font-medium hover:bg-[#0160A3] transition-colors">
                    Connect
                  </button>
                </div>
              </div>

              {/* HubSpot Card - Coming Soon */}
              <div className="bg-white rounded-md border border-gray-200 p-6 opacity-60 cursor-not-allowed relative">
                <div className="absolute top-3 right-3 bg-gray-400 text-white px-2 py-0.5 text-xs font-medium rounded">
                  COMING SOON
                </div>
                <div className="flex flex-col items-center text-center pt-2">
                  <div className="w-14 h-14 bg-gray-100 rounded flex items-center justify-center mb-4">
                    <Building2 className="w-7 h-7 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-500 mb-1">HubSpot</h3>
                  <p className="text-sm text-gray-400 mb-6">
                    HubSpot integration coming soon
                  </p>
                  <button
                    disabled
                    className="w-full bg-gray-100 text-gray-400 py-2 rounded text-sm font-medium cursor-not-allowed"
                  >
                    Coming Soon
                  </button>
                </div>
              </div>

              {/* Zoho Card - Coming Soon */}
              <div className="bg-white rounded-md border border-gray-200 p-6 opacity-60 cursor-not-allowed relative">
                <div className="absolute top-3 right-3 bg-gray-400 text-white px-2 py-0.5 text-xs font-medium rounded">
                  COMING SOON
                </div>
                <div className="flex flex-col items-center text-center pt-2">
                  <div className="w-14 h-14 bg-gray-100 rounded flex items-center justify-center mb-4">
                    <Building2 className="w-7 h-7 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-500 mb-1">Zoho</h3>
                  <p className="text-sm text-gray-400 mb-6">
                    Zoho integration coming soon
                  </p>
                  <button
                    disabled
                    className="w-full bg-gray-100 text-gray-400 py-2 rounded text-sm font-medium cursor-not-allowed"
                  >
                    Coming Soon
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Dashboard with Sidebar */}
      {step === 3 && (
        <div className="flex h-screen bg-[#fafaf9]">
          {/* Sidebar */}
          <Sidebar>
            <SidebarHeader>
              <div className="flex items-center space-x-3">
                <img 
                  src="/salesforce-logo.png" 
                  alt="Salesforce" 
                  className="h-7 object-contain"
                />
                <div>
                  <p className="font-semibold text-sm text-gray-900">Partner Experience</p>
                  <div className="flex items-center space-x-1.5 mt-0.5">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-gray-500">Connected</span>
                  </div>
                </div>
              </div>
            </SidebarHeader>
            <SidebarContent>
              <SidebarItem
                active={activeSection === 'opportunities'}
                onClick={() => setActiveSection('opportunities')}
              >
                <Briefcase className="w-4 h-4" />
                <span>Opportunities</span>
              </SidebarItem>
              <SidebarItem
                active={activeSection === 'leads'}
                onClick={() => setActiveSection('leads')}
              >
                <Users className="w-4 h-4" />
                <span>Leads</span>
              </SidebarItem>
            </SidebarContent>
            <SidebarFooter>
              <Button
                variant="ghost"
                className="w-full justify-start text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                onClick={() => {
                  salesforceAPI.logout()
                  setStep(1)
                  setOpportunities([])
                  setLeads([])
                  setError(null)
                }}
              >
                <LogOut className="w-4 h-4 mr-2" />
                <span>Logout</span>
              </Button>
            </SidebarFooter>
          </Sidebar>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-8 max-w-7xl mx-auto">
              {/* Sync Notifications */}
              {syncNotifications.length > 0 && (
                <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
                  {syncNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`rounded-md p-4 shadow-lg flex items-center space-x-3 animate-in slide-in-from-right ${
                        notification.type === 'success'
                          ? 'bg-green-50 border border-green-200'
                          : notification.type === 'error'
                          ? 'bg-red-50 border border-red-200'
                          : 'bg-blue-50 border border-blue-200'
                      }`}
                    >
                      {notification.type === 'success' ? (
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      ) : notification.type === 'error' ? (
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                      ) : (
                        <Loader2 className="w-5 h-5 text-blue-600 flex-shrink-0 animate-spin" />
                      )}
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${
                          notification.type === 'success'
                            ? 'text-green-800'
                            : notification.type === 'error'
                            ? 'text-red-800'
                            : 'text-blue-800'
                        }`}>
                          {notification.message}
                        </p>
                      </div>
                      <button
                        onClick={() => setSyncNotifications(prev => prev.filter(n => n.id !== notification.id))}
                        className={`flex-shrink-0 ${
                          notification.type === 'success'
                            ? 'text-green-600 hover:text-green-800'
                            : notification.type === 'error'
                            ? 'text-red-600 hover:text-red-800'
                            : 'text-blue-600 hover:text-blue-800'
                        }`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border border-red-100 rounded-md p-4 mb-6 flex items-center space-x-3">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800">{error}</p>
                  </div>
                  <button
                    onClick={() => setError(null)}
                    className="text-red-600 hover:text-red-800 flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Header */}
              <div className="mb-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-semibold text-gray-900 mb-1">
                      {activeSection === 'opportunities' ? 'Opportunities' : 'Leads'}
                    </h1>
                    <p className="text-sm text-gray-500">
                      {activeSection === 'opportunities' 
                        ? 'Manage your sales opportunities' 
                        : 'Manage your leads and prospects'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={loadSalesforceData}
                      disabled={isLoading || isPolling}
                      variant="outline"
                      size="sm"
                      className="text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-900"
                      title="Refresh data from Salesforce"
                    >
                      {isLoading ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      <span>Refresh</span>
                    </Button>
                    <Button
                      onClick={() => activeSection === 'opportunities' ? setShowOpportunityModal(true) : setShowLeadModal(true)}
                      size="sm"
                      className="bg-[#0176D3] hover:bg-[#0160A3] text-white shadow-sm"
                    >
                      {activeSection === 'opportunities' ? (
                        <>
                          <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
                          <span>New Opportunity</span>
                        </>
                      ) : (
                        <>
                          <Users className="w-3.5 h-3.5 mr-1.5" />
                          <span>New Lead</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Opportunities Content */}
              {activeSection === 'opportunities' && (
                <div>
                  {opportunities.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-md border border-gray-100">
                      <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-600 font-medium mb-1">No opportunities yet</p>
                      <p className="text-sm text-gray-400">Click "New Opportunity" to get started</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {opportunities.map((opp) => (
                        <div
                          key={opp.id}
                          className="bg-white rounded-md border border-gray-100 p-5 hover:border-gray-200 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-3 flex-wrap">
                                <h3 className="text-base font-semibold text-gray-900 truncate">{opp.name}</h3>
                                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium whitespace-nowrap">
                                  {opp.stage}
                                </span>
                                {opp.synced && (
                                  <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs font-medium flex items-center gap-1 whitespace-nowrap">
                                    <CheckCircle className="w-3 h-3" />
                                    <span>Synced</span>
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-6 text-sm text-gray-600">
                                <div className="flex items-center gap-1.5">
                                  <DollarSign className="w-4 h-4 text-gray-400" />
                                  <span className="font-medium">${opp.amount.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="w-4 h-4 text-gray-400" />
                                  <span>{new Date(opp.closeDate).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 ml-4 flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditOpportunity(opp)}
                                disabled={!opp.synced || isUpdating}
                                className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                                title={!opp.synced ? "Only synced opportunities can be edited" : "Edit opportunity"}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteOpportunity(opp)}
                                disabled={!opp.synced || isDeleting === opp.id}
                                className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed"
                                title={!opp.synced ? "Only synced opportunities can be deleted" : "Delete opportunity"}
                              >
                                {isDeleting === opp.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Leads Content */}
              {activeSection === 'leads' && (
                <div>
                  {isLoading ? (
                    <div className="text-center py-16 bg-white rounded-md border border-gray-100">
                      <Loader2 className="w-6 h-6 text-gray-400 mx-auto mb-3 animate-spin" />
                      <p className="text-sm text-gray-500">Loading leads...</p>
                    </div>
                  ) : leads.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-md border border-gray-100">
                      <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-600 font-medium mb-1">No leads yet</p>
                      <p className="text-sm text-gray-400">Click "New Lead" to get started</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {leads.map((lead) => (
                        <div
                          key={lead.id}
                          className="bg-white rounded-md border border-gray-100 p-5 hover:border-gray-200 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-3 flex-wrap">
                                <h3 className="text-base font-semibold text-gray-900">
                                  {lead.firstName} {lead.lastName}
                                </h3>
                                <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs font-medium whitespace-nowrap">
                                  {lead.status}
                                </span>
                                {lead.synced && (
                                  <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs font-medium flex items-center gap-1 whitespace-nowrap">
                                    <CheckCircle className="w-3 h-3" />
                                    <span>Synced</span>
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-6 text-sm text-gray-600">
                                <div className="flex items-center gap-1.5">
                                  <Building2 className="w-4 h-4 text-gray-400" />
                                  <span className="font-medium">{lead.company}</span>
                                </div>
                                <div className="text-gray-500">
                                  {lead.email}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 ml-4 flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditLead(lead)}
                                disabled={!lead.synced || isUpdating}
                                className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                                title={!lead.synced ? "Only synced leads can be edited" : "Edit lead"}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteLead(lead)}
                                disabled={!lead.synced || isDeleting === lead.id}
                                className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed"
                                title={!lead.synced ? "Only synced leads can be deleted" : "Delete lead"}
                              >
                                {isDeleting === lead.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Salesforce Authentication Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-md shadow-lg max-w-md w-full p-6 relative border border-gray-100">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              <div className="flex items-center justify-center mb-4">
                <img 
                  src="/salesforce-logo.png" 
                  alt="Salesforce" 
                  className="h-8 object-contain"
                />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-1.5 text-center">
                Authenticate with Salesforce
              </h2>
              <p className="text-sm text-gray-500 text-center">
                Enter your Salesforce credentials to connect your organization
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-md p-3 mb-4 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {showSuccess ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-lg font-semibold text-gray-900">Success!</p>
                <p className="text-sm text-gray-500 mt-1">Your Salesforce account has been connected</p>
              </div>
            ) : (
              <form onSubmit={handleSalesforceAuth} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="sf-username" className="text-sm font-medium text-gray-700">
                    Salesforce Username
                  </label>
                  <Input
                    id="sf-username"
                    type="email"
                    value={salesforceUsername}
                    onChange={(e) => setSalesforceUsername(e.target.value)}
                    required
                    placeholder="username@example.com"
                    className="border-gray-200 focus:border-[#0176D3] focus:ring-[#0176D3]"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="sf-password" className="text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <Input
                    id="sf-password"
                    type="password"
                    value={salesforcePassword}
                    onChange={(e) => setSalesforcePassword(e.target.value)}
                    required
                    placeholder="Enter your password"
                    className="border-gray-200 focus:border-[#0176D3] focus:ring-[#0176D3]"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="sf-token" className="text-sm font-medium text-gray-700">
                    Security Token
                  </label>
                  <Input
                    id="sf-token"
                    type="text"
                    value={salesforceToken}
                    onChange={(e) => setSalesforceToken(e.target.value)}
                    required
                    placeholder="Enter your security token"
                    className="border-gray-200 focus:border-[#0176D3] focus:ring-[#0176D3] font-mono text-sm"
                  />
                  <p className="text-xs text-gray-400">
                    Your security token is required for API authentication
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={isAuthenticating}
                  className="w-full bg-[#0176D3] hover:bg-[#0160A3] text-white shadow-sm"
                >
                  {isAuthenticating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      <span>Verifying Credentials...</span>
                    </>
                  ) : (
                    <span>Connect Organization</span>
                  )}
                </Button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Log Opportunity Modal */}
      {showOpportunityModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-md shadow-lg max-w-lg w-full p-6 relative max-h-[90vh] overflow-y-auto border border-gray-100">
            <button
              onClick={() => setShowOpportunityModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-1.5">
                Create Opportunity in Salesforce
              </h2>
              <p className="text-sm text-gray-500">
                Fill in the details to log a new opportunity
              </p>
            </div>

            <form onSubmit={handleCreateOpportunity} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="opp-name" className="text-sm font-medium text-gray-700">
                  Opportunity Name
                </label>
                <Input
                  id="opp-name"
                  type="text"
                  value={oppName}
                  onChange={(e) => setOppName(e.target.value)}
                  required
                  placeholder="e.g., Q4 Enterprise Deal"
                  className="border-gray-200 focus:border-[#0176D3] focus:ring-[#0176D3]"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="opp-stage" className="text-sm font-medium text-gray-700">
                  Stage
                </label>
                <select
                  id="opp-stage"
                  value={oppStage}
                  onChange={(e) => setOppStage(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-gray-200 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0176D3] focus-visible:ring-offset-2"
                >
                  <option value="Prospecting">Prospecting</option>
                  <option value="Qualification">Qualification</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="opp-amount" className="text-sm font-medium text-gray-700">
                  Amount ($)
                </label>
                <Input
                  id="opp-amount"
                  type="number"
                  value={oppAmount}
                  onChange={(e) => setOppAmount(e.target.value)}
                  required
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="border-gray-200 focus:border-[#0176D3] focus:ring-[#0176D3]"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="opp-date" className="text-sm font-medium text-gray-700">
                  Close Date
                </label>
                <Input
                  id="opp-date"
                  type="date"
                  value={oppCloseDate}
                  onChange={(e) => setOppCloseDate(e.target.value)}
                  required
                  className="border-gray-200 focus:border-[#0176D3] focus:ring-[#0176D3]"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-md border border-gray-100">
                <div>
                  <label htmlFor="sync-toggle" className="block text-sm font-medium text-gray-700 mb-0.5">
                    Sync to Raintree Systems immediately
                  </label>
                  <p className="text-xs text-gray-400">
                    Enable automatic synchronization upon creation
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    id="sync-toggle"
                    type="checkbox"
                    checked={syncToRaintree}
                    onChange={(e) => setSyncToRaintree(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#0176D3]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0176D3]"></div>
                </label>
              </div>

              <div className="flex space-x-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowOpportunityModal(false)}
                  className="flex-1 border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 bg-[#0176D3] hover:bg-[#0160A3] text-white shadow-sm"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    'Create Opportunity'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Opportunity Modal */}
      {showEditOpportunityModal && editingOpportunity && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-md shadow-lg max-w-lg w-full p-6 relative max-h-[90vh] overflow-y-auto border border-gray-100">
            <button
              onClick={() => {
                setShowEditOpportunityModal(false)
                setEditingOpportunity(null)
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-1.5">
                Edit Opportunity
              </h2>
              <p className="text-sm text-gray-500">
                Update the opportunity details
              </p>
            </div>

            <form onSubmit={handleUpdateOpportunity} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="edit-opp-name" className="text-sm font-medium text-gray-700">
                  Opportunity Name
                </label>
                <Input
                  id="edit-opp-name"
                  type="text"
                  value={editOppName}
                  onChange={(e) => setEditOppName(e.target.value)}
                  required
                  placeholder="e.g., Q4 Enterprise Deal"
                  className="border-gray-200 focus:border-[#0176D3] focus:ring-[#0176D3]"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="edit-opp-stage" className="text-sm font-medium text-gray-700">
                  Stage
                </label>
                <select
                  id="edit-opp-stage"
                  value={editOppStage}
                  onChange={(e) => setEditOppStage(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-gray-200 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0176D3] focus-visible:ring-offset-2"
                >
                  <option value="Prospecting">Prospecting</option>
                  <option value="Qualification">Qualification</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="edit-opp-amount" className="text-sm font-medium text-gray-700">
                  Amount ($)
                </label>
                <Input
                  id="edit-opp-amount"
                  type="number"
                  value={editOppAmount}
                  onChange={(e) => setEditOppAmount(e.target.value)}
                  required
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="border-gray-200 focus:border-[#0176D3] focus:ring-[#0176D3]"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="edit-opp-date" className="text-sm font-medium text-gray-700">
                  Close Date
                </label>
                <Input
                  id="edit-opp-date"
                  type="date"
                  value={editOppCloseDate}
                  onChange={(e) => setEditOppCloseDate(e.target.value)}
                  required
                  className="border-gray-200 focus:border-[#0176D3] focus:ring-[#0176D3]"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-md border border-gray-100">
                <div>
                  <label htmlFor="edit-sync-toggle" className="block text-sm font-medium text-gray-700 mb-0.5">
                    Sync to Raintree Systems
                  </label>
                  <p className="text-xs text-gray-400">
                    Update in Raintree Salesforce as well
                  </p>
                  {editSyncToRaintree && !editingOpportunity?.raintreeOpportunityId && (
                    <p className="text-xs text-amber-600 mt-1">
                      ⚠️ This opportunity was not synced to Raintree when created. Update will only apply to Partner Salesforce.
                    </p>
                  )}
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    id="edit-sync-toggle"
                    type="checkbox"
                    checked={editSyncToRaintree}
                    onChange={(e) => setEditSyncToRaintree(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#0176D3]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0176D3]"></div>
                </label>
              </div>

              <div className="flex space-x-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowEditOpportunityModal(false)
                    setEditingOpportunity(null)
                  }}
                  className="flex-1 border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isUpdating}
                  className="flex-1 bg-[#0176D3] hover:bg-[#0160A3] text-white shadow-sm"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    'Update Opportunity'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Lead Modal */}
      {showLeadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-md shadow-lg max-w-lg w-full p-6 relative max-h-[90vh] overflow-y-auto border border-gray-100">
            <button
              onClick={() => setShowLeadModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-1.5">
                Create Lead in Salesforce
              </h2>
              <p className="text-sm text-gray-500">
                Fill in the details to create a new lead
              </p>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="lead-firstname" className="text-sm font-medium text-gray-700">
                    First Name
                  </label>
                  <Input
                    id="lead-firstname"
                    type="text"
                    value={leadFirstName}
                    onChange={(e) => setLeadFirstName(e.target.value)}
                    required
                    placeholder="John"
                    className="border-gray-200 focus:border-[#0176D3] focus:ring-[#0176D3]"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="lead-lastname" className="text-sm font-medium text-gray-700">
                    Last Name
                  </label>
                  <Input
                    id="lead-lastname"
                    type="text"
                    value={leadLastName}
                    onChange={(e) => setLeadLastName(e.target.value)}
                    required
                    placeholder="Doe"
                    className="border-gray-200 focus:border-[#0176D3] focus:ring-[#0176D3]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="lead-company" className="text-sm font-medium text-gray-700">
                  Company
                </label>
                <Input
                  id="lead-company"
                  type="text"
                  value={leadCompany}
                  onChange={(e) => setLeadCompany(e.target.value)}
                  required
                  placeholder="Acme Inc."
                  className="border-gray-200 focus:border-[#0176D3] focus:ring-[#0176D3]"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="lead-email" className="text-sm font-medium text-gray-700">
                  Email
                </label>
                <Input
                  id="lead-email"
                  type="email"
                  value={leadEmail}
                  onChange={(e) => setLeadEmail(e.target.value)}
                  required
                  placeholder="john.doe@acme.com"
                  className="border-gray-200 focus:border-[#0176D3] focus:ring-[#0176D3]"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="lead-status" className="text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  id="lead-status"
                  value={leadStatus}
                  onChange={(e) => setLeadStatus(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-gray-200 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0176D3] focus-visible:ring-offset-2"
                >
                  <option value="Open - Not Contacted">Open - Not Contacted</option>
                  <option value="Working - Contacted">Working - Contacted</option>
                  <option value="Closed - Converted">Closed - Converted</option>
                  <option value="Closed - Not Converted">Closed - Not Converted</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-md border border-gray-100">
                <div>
                  <label htmlFor="sync-lead-toggle" className="block text-sm font-medium text-gray-700 mb-0.5">
                    Sync to Raintree Systems immediately
                  </label>
                  <p className="text-xs text-gray-400">
                    Enable automatic synchronization upon creation
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    id="sync-lead-toggle"
                    type="checkbox"
                    checked={syncLeadToRaintree}
                    onChange={(e) => setSyncLeadToRaintree(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#0176D3]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0176D3]"></div>
                </label>
              </div>

              <div className="flex space-x-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowLeadModal(false)}
                  className="flex-1 border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 bg-[#0176D3] hover:bg-[#0160A3] text-white shadow-sm"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    'Create Lead'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Lead Modal */}
      {showEditLeadModal && editingLead && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-md shadow-lg max-w-lg w-full p-6 relative max-h-[90vh] overflow-y-auto border border-gray-100">
            <button
              onClick={() => {
                setShowEditLeadModal(false)
                setEditingLead(null)
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-1.5">
                Edit Lead
              </h2>
              <p className="text-sm text-gray-500">
                Update the lead details
              </p>
            </div>

            <form onSubmit={handleUpdateLead} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="edit-lead-firstname" className="text-sm font-medium text-gray-700">
                    First Name
                  </label>
                  <Input
                    id="edit-lead-firstname"
                    type="text"
                    value={editLeadFirstName}
                    onChange={(e) => setEditLeadFirstName(e.target.value)}
                    required
                    placeholder="John"
                    className="border-gray-200 focus:border-[#0176D3] focus:ring-[#0176D3]"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="edit-lead-lastname" className="text-sm font-medium text-gray-700">
                    Last Name
                  </label>
                  <Input
                    id="edit-lead-lastname"
                    type="text"
                    value={editLeadLastName}
                    onChange={(e) => setEditLeadLastName(e.target.value)}
                    required
                    placeholder="Doe"
                    className="border-gray-200 focus:border-[#0176D3] focus:ring-[#0176D3]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="edit-lead-company" className="text-sm font-medium text-gray-700">
                  Company
                </label>
                <Input
                  id="edit-lead-company"
                  type="text"
                  value={editLeadCompany}
                  onChange={(e) => setEditLeadCompany(e.target.value)}
                  required
                  placeholder="Acme Inc."
                  className="border-gray-200 focus:border-[#0176D3] focus:ring-[#0176D3]"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="edit-lead-email" className="text-sm font-medium text-gray-700">
                  Email
                </label>
                <Input
                  id="edit-lead-email"
                  type="email"
                  value={editLeadEmail}
                  onChange={(e) => setEditLeadEmail(e.target.value)}
                  required
                  placeholder="john.doe@acme.com"
                  className="border-gray-200 focus:border-[#0176D3] focus:ring-[#0176D3]"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="edit-lead-status" className="text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  id="edit-lead-status"
                  value={editLeadStatus}
                  onChange={(e) => setEditLeadStatus(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-gray-200 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0176D3] focus-visible:ring-offset-2"
                >
                  <option value="Open - Not Contacted">Open - Not Contacted</option>
                  <option value="Working - Contacted">Working - Contacted</option>
                  <option value="Closed - Converted">Closed - Converted</option>
                  <option value="Closed - Not Converted">Closed - Not Converted</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-md border border-gray-100">
                <div>
                  <label htmlFor="edit-sync-lead-toggle" className="block text-sm font-medium text-gray-700 mb-0.5">
                    Sync to Raintree Systems
                  </label>
                  <p className="text-xs text-gray-400">
                    Update in Raintree Salesforce as well
                  </p>
                  {editSyncLeadToRaintree && !editingLead?.raintreeLeadId && (
                    <p className="text-xs text-amber-600 mt-1">
                      ⚠️ This lead was not synced to Raintree when created. Update will only apply to Partner Salesforce.
                    </p>
                  )}
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    id="edit-sync-lead-toggle"
                    type="checkbox"
                    checked={editSyncLeadToRaintree}
                    onChange={(e) => setEditSyncLeadToRaintree(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#0176D3]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0176D3]"></div>
                </label>
              </div>

              <div className="flex space-x-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowEditLeadModal(false)
                    setEditingLead(null)
                  }}
                  className="flex-1 border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isUpdating}
                  className="flex-1 bg-[#0176D3] hover:bg-[#0160A3] text-white shadow-sm"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    'Update Lead'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App

