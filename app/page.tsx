// app/page.tsx - PURE UI UPGRADE (NO FUNCTIONAL CHANGES)
"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import {
  Upload, FileText, Download, Loader2, CheckCircle, XCircle, 
  Copy, AlertCircle, FileSpreadsheet, FolderOpen, Search,
  Filter, ChevronDown, X, Eye, Trash2, Archive
} from "lucide-react"

// KEEP ALL YOUR EXISTING INTERFACES - NO CHANGES
interface ExtractedData {
  [key: string]: any
}

interface ResultItem {
  filename: string
  status: "success" | "error"
  data?: ExtractedData
  error?: string
}

interface ApiResponse {
  success: boolean
  timestamp: string
  total_files: number
  processed_files: number
  failed_files?: number
  results?: ResultItem[]
  extraction_data?: ExtractedData[]
  renamed_files?: { [key: string]: string }
  download_links?: {
    excel?: string
    zip?: string
  }
  file_info?: {
    excel_filename?: string
    zip_filename?: string
    zip_size?: number
    total_renamed_files?: number
    total_records?: number
  }
}

export default function PDFExtractorPage() {
  // KEEP ALL YOUR EXISTING STATE - NO CHANGES
  const [files, setFiles] = useState<FileList | null>(null)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<ApiResponse | null>(null)
  const [apiStatus, setApiStatus] = useState<"checking" | "online" | "offline">("checking")
  const [documentType, setDocumentType] = useState<string>("SKTT")
  const [useNameForRename, setUseNameForRename] = useState<boolean>(true)
  const [usePassportForRename, setUsePassportForRename] = useState<boolean>(true)
  const [enableFileRename, setEnableFileRename] = useState<boolean>(false)
  
  // NEW UI STATE ONLY
  const [isDragging, setIsDragging] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("upload")
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const { toast } = useToast()
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://fermanta-pdf-extractor-api.hf.space"

  // KEEP ALL YOUR EXISTING useEffect and functions EXACTLY THE SAME
  useEffect(() => {
    const checkApiStatus = async () => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      try {
        const response = await fetch(`${API_URL}/health`, {
          method: "GET",
          headers: { Accept: "application/json" },
          mode: "cors",
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (response.ok) {
          setApiStatus("online")
          console.log("API is online:", API_URL)
        } else {
          console.warn("API responded but not ready:", response.status)
          setApiStatus("offline")
        }
      } catch (err) {
        clearTimeout(timeoutId)
        console.error("API connection error:", err)
        setApiStatus("offline")
      }
    }

    checkApiStatus()
  }, [API_URL])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files)
    setResults(null)
  }

  // ADD: Drag and Drop handlers (UI ONLY)
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFiles = e.dataTransfer.files
    if (droppedFiles.length > 0) {
      setFiles(droppedFiles)
      setResults(null)
    }
  }

  // KEEP YOUR EXISTING handleSubmit EXACTLY THE SAME
  const handleSubmit = async (e: React.FormEvent) => {
    // ... (KEEP YOUR ENTIRE EXISTING handleSubmit CODE)
    e.preventDefault()

    if (!files || files.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one PDF file",
        variant: "destructive",
      })
      return
    }

    if (apiStatus === "offline") {
      toast({
        title: "API Offline",
        description: "The API server appears to be offline. Please try again later.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const formData = new FormData()
      Array.from(files).forEach((file) => {
        formData.append("files", file)
      })

      formData.append("document_type", documentType)

      let endpoint = "/extract"

      if (enableFileRename) {
        endpoint = "/extract-with-rename"
        formData.append("use_name_for_rename", useNameForRename.toString())
        formData.append("use_passport_for_rename", usePassportForRename.toString())
      } else {
        endpoint = "/extract-batch"
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60000)

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        body: formData,
        signal: controller.signal,
        mode: "cors",
        headers: { Accept: "application/json" },
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("API Error Response:", response.status, errorText)
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText || "No error details available"}`)
      }

      const data: ApiResponse = await response.json()

      if (enableFileRename && data.extraction_data) {
        const convertedResults: ResultItem[] = data.extraction_data.map((extractedData, index) => ({
          filename: extractedData.Source_File || files[index]?.name || `File ${index + 1}`,
          status: "success" as const,
          data: extractedData,
        }))

        setResults({
          ...data,
          results: convertedResults,
        })
      } else if (!enableFileRename && data.extraction_data) {
        const convertedResults: ResultItem[] = data.extraction_data.map((extractedData, index) => ({
          filename: extractedData.Source_File || files[index]?.name || `File ${index + 1}`,
          status: "success" as const,
          data: extractedData,
        }))

        setResults({
          ...data,
          results: convertedResults,
        })
      } else {
        setResults(data)
      }

      setActiveTab("results") // Auto switch to results tab
      
      toast({
        title: "Success",
        description: `Processed ${data.processed_files} out of ${data.total_files} files`,
      })
    } catch (error) {
      console.error("Fetch Error:", error)

      if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
        toast({
          title: "Connection Error",
          description: "Could not connect to the API server. Please check your internet connection or try again later.",
          variant: "destructive",
        })
      } else if (error instanceof DOMException && error.name === "AbortError") {
        toast({
          title: "Request Timeout",
          description: "The request took too long to complete. Please try again or use smaller files.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error",
          description: `Failed to extract text: ${error instanceof Error ? error.message : "Unknown error"}`,
          variant: "destructive",
        })
      }
    } finally {
      setLoading(false)
    }
  }

  // KEEP ALL YOUR EXISTING FUNCTIONS
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied",
      description: "Text copied to clipboard",
    })
  }

  const downloadAllAsJSON = () => {
    if (!results) return

    const element = document.createElement("a")
    const file = new Blob([JSON.stringify(results, null, 2)], { type: "application/json" })
    element.href = URL.createObjectURL(file)
    element.download = `pdf_extraction_results_${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  const downloadRenamedZip = async (retryCount = 0) => {
    console.log("=== ZIP DOWNLOAD ATTEMPT ===")
    console.log("Retry count:", retryCount)
    console.log("Results object:", results)

    if (!results) {
      toast({
        title: "Error",
        description: "No results available. Please process files first.",
        variant: "destructive",
      })
      return
    }

    // Check if download_links exists
    if (!results.download_links?.zip) {
      console.error("No download_links.zip found in results:", results)
      toast({
        title: "Error",
        description: "No ZIP download link available. Please try processing the files again.",
        variant: "destructive",
      })
      return
    }

    try {
      // Extract filename from download link
      const zipPath = results.download_links.zip
      const filename = zipPath.split("/").pop() || "renamed_files.zip"
      const downloadUrl = `${API_URL}${zipPath}`

      console.log("Download details:")
      console.log("  ZIP path:", zipPath)
      console.log("  Filename:", filename)
      console.log("  Download URL:", downloadUrl)
      console.log("  File info:", results.file_info)

      // Add timeout and better error handling
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 second timeout for ZIP

      console.log("Making fetch request...")
      const response = await fetch(downloadUrl, {
        method: "GET",
        headers: {
          Accept: "application/zip, application/octet-stream, */*",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
        mode: "cors",
        credentials: "omit",
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      console.log("Response received:")
      console.log("  Status:", response.status)
      console.log("  Status text:", response.statusText)
      console.log("  Headers:", Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Response error text:", errorText)

        // If 404 and this is first retry, wait a moment and try again
        if (response.status === 404 && retryCount < 2) {
          console.log(`404 error, retrying in 3 seconds... (attempt ${retryCount + 1})`)
          await new Promise((resolve) => setTimeout(resolve, 3000))
          return downloadRenamedZip(retryCount + 1)
        }

        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`)
      }

      const contentType = response.headers.get("content-type")
      console.log("Content-Type:", contentType)

      const blob = await response.blob()
      console.log("Blob size:", blob.size, "bytes")

      if (blob.size === 0) {
        throw new Error("Downloaded file is empty")
      }

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "Download Complete",
        description: `ZIP file downloaded successfully (${(blob.size / 1024 / 1024).toFixed(2)} MB)`,
      })
    } catch (error) {
      console.error("ZIP download error:", error)

      let errorMessage = "Unknown error occurred"
      if (error instanceof DOMException && error.name === "AbortError") {
        errorMessage = "Download timed out. Please try again."
      } else if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
        errorMessage = "Network error. Please check your connection."
      } else if (error instanceof Error) {
        errorMessage = error.message
      }

      // Show retry option for certain errors
      if (retryCount < 2 && (errorMessage.includes("404") || errorMessage.includes("Network"))) {
        toast({
          title: "Download Failed",
          description: `${errorMessage} Attempting retry...`,
          variant: "destructive",
        })
        await new Promise((resolve) => setTimeout(resolve, 2000))
        return downloadRenamedZip(retryCount + 1)
      }

      toast({
        title: "Download Error",
        description: `Failed to download ZIP file: ${errorMessage}`,
        variant: "destructive",
      })
    }
  }

  const downloadExcelFromBackend = async (retryCount = 0) => {
    console.log("=== EXCEL DOWNLOAD ATTEMPT ===")
    console.log("Retry count:", retryCount)
    console.log("Results object:", results)

    if (!results) {
      toast({
        title: "Error",
        description: "No results available. Please process files first.",
        variant: "destructive",
      })
      return
    }

    // Check if download_links exists
    if (!results.download_links?.excel) {
      console.error("No download_links.excel found in results:", results)
      toast({
        title: "Error",
        description: "No Excel download link available. Please try processing the files again.",
        variant: "destructive",
      })
      return
    }

    try {
      // Extract filename from download link
      const excelPath = results.download_links.excel
      const filename = excelPath.split("/").pop() || "hasil_ekstraksi.xlsx"
      const downloadUrl = `${API_URL}${excelPath}`

      console.log("Excel download details:")
      console.log("  Excel path:", excelPath)
      console.log("  Filename:", filename)
      console.log("  Download URL:", downloadUrl)

      // Add timeout and better error handling
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout for Excel

      console.log("Making Excel fetch request...")
      const response = await fetch(downloadUrl, {
        method: "GET",
        headers: {
          Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/octet-stream, */*",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
        mode: "cors",
        credentials: "omit",
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      console.log("Excel response received:")
      console.log("  Status:", response.status)
      console.log("  Status text:", response.statusText)
      console.log("  Headers:", Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Excel response error text:", errorText)

        // If 404 and this is first retry, wait a moment and try again
        if (response.status === 404 && retryCount < 2) {
          console.log(`Excel 404 error, retrying in 3 seconds... (attempt ${retryCount + 1})`)
          await new Promise((resolve) => setTimeout(resolve, 3000))
          return downloadExcelFromBackend(retryCount + 1)
        }

        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`)
      }

      const contentType = response.headers.get("content-type")
      console.log("Excel Content-Type:", contentType)

      const blob = await response.blob()
      console.log("Excel blob size:", blob.size, "bytes")

      if (blob.size === 0) {
        throw new Error("Downloaded Excel file is empty")
      }

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "Excel Download Complete",
        description: `Excel file downloaded successfully (${(blob.size / 1024).toFixed(2)} KB)`,
      })
    } catch (error) {
      console.error("Excel download error:", error)

      let errorMessage = "Unknown error occurred"
      if (error instanceof DOMException && error.name === "AbortError") {
        errorMessage = "Download timed out. Please try again."
      } else if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
        errorMessage = "Network error. Please check your connection."
      } else if (error instanceof Error) {
        errorMessage = error.message
      }

      // Show retry option for certain errors
      if (retryCount < 2 && (errorMessage.includes("404") || errorMessage.includes("Network"))) {
        toast({
          title: "Excel Download Failed",
          description: `${errorMessage} Attempting retry...`,
          variant: "destructive",
        })
        await new Promise((resolve) => setTimeout(resolve, 2000))
        return downloadExcelFromBackend(retryCount + 1)
      }

      toast({
        title: "Excel Download Error",
        description: `Failed to download Excel file: ${errorMessage}`,
        variant: "destructive",
      })
    }
  }

  const downloadAsExcel = () => {
    if (!results || !results.results) return

    const successfulResults = results.results.filter((r) => r.status === "success" && r.data)
    const excelData = successfulResults.map((result, index) => {
      const baseData = {
        No: index + 1,
        Filename: result.filename,
        "Document Type": result.data?.["Jenis Dokumen"] || documentType,
      }

      // Add fields based on document type
      if (documentType === "DKPTKA") {
        return {
          ...baseData,
          "Nama Pemberi Kerja": result.data?.["Nama Pemberi Kerja"] || "",
          Alamat: result.data?.["Alamat"] || "",
          "No Telepon": result.data?.["No Telepon"] || "",
          Email: result.data?.["Email"] || "",
          "Nama TKA": result.data?.["Nama TKA"] || "",
          "Tempat/Tanggal Lahir": result.data?.["Tempat/Tanggal Lahir"] || "",
          "Nomor Paspor": result.data?.["Nomor Paspor"] || "",
          Kewarganegaraan: result.data?.["Kewarganegaraan"] || "",
          Jabatan: result.data?.["Jabatan"] || "",
          "Lokasi Kerja": result.data?.["Lokasi Kerja"] || "",
          "Kode Billing Pembayaran": result.data?.["Kode Billing Pembayaran"] || "",
          DKPTKA: result.data?.["DKPTKA"] || "",
        }
      } else {
        return {
          ...baseData,
          Name: result.data?.Name || result.data?.["Nama TKA"] || "",
          "Place of Birth":
            result.data?.["Place of Birth"] || result.data?.["Place & Date of Birth"]?.split(",")[0] || "",
          "Date of Birth":
            result.data?.["Date of Birth"] ||
            result.data?.["Place & Date of Birth"]?.split(",")[1]?.trim() ||
            result.data?.["Tempat/Tanggal Lahir"] ||
            "",
          "Passport No":
            result.data?.["Passport No"] || result.data?.["Passport Number"] || result.data?.["Nomor Paspor"] || "",
          "Passport Expiry": result.data?.["Passport Expiry"] || "",
          "Date Issue": result.data?.["Date Issue"] || "",
          NIK: result.data?.NIK || "",
          Nationality: result.data?.Nationality || result.data?.Kewarganegaraan || "",
          Gender: result.data?.["Jenis Kelamin"] || result.data?.Gender || "",
          Address: result.data?.Address || result.data?.["Alamat Tempat Tinggal"] || "",
          Occupation: result.data?.Occupation || result.data?.Jabatan || "",
          "Permit Number": result.data?.["Permit Number"] || "",
          "Stay Permit Expiry": result.data?.["Stay Permit Expiry"] || "",
          "Nomor Keputusan": result.data?.["Nomor Keputusan"] || "",
          "Lokasi Kerja": result.data?.["Lokasi Kerja"] || "",
          Berlaku: result.data?.Berlaku || "",
        }
      }
    })

    // Convert to CSV format (fallback method)
    const headers = Object.keys(excelData[0] || {})
    const csvContent = [
      headers.join(","),
      ...excelData.map((row) => headers.map((header) => `"${row[header as keyof typeof row] || ""}"`).join(",")),
    ].join("\n")

    const element = document.createElement("a")
    const file = new Blob([csvContent], { type: "text/csv" })
    element.href = URL.createObjectURL(file)
    element.download = `Hasil_Ekstraksi_${documentType}_${new Date().toISOString().split("T")[0]}.csv`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)

    toast({
      title: "CSV Downloaded",
      description: "Extraction results have been downloaded as CSV file (fallback method)",
    })
  }

  const getTableColumns = () => {
    if (!results || !results.results || results.results.length === 0) return []

    const successfulResult = results.results.find((r) => r.status === "success" && r.data)
    if (!successfulResult?.data) return []

    switch (documentType) {
      case "SKTT":
        return [
          "Name",
          "NIK",
          "Place of Birth",
          "Date of Birth",
          "Gender",
          "Nationality",
          "Occupation",
          "Address",
          "KITAS/KITAP",
          "Passport Expiry",
          "Date Issue",
          "Document Type",
        ]
      case "EVLN":
        return [
          "Name",
          "Place of Birth",
          "Date of Birth",
          "Passport No",
          "Passport Expiry",
          "Date Issue",
          "Document Type",
        ]
      case "ITAS":
      case "ITK":
        return [
          "Name",
          "Permit Number",
          "Place & Date of Birth",
          "Passport Number",
          "Passport Expiry",
          "Nationality",
          "Gender",
          "Address",
          "Occupation",
          "Date Issue",
          "Document Type",
        ]
      case "Notifikasi":
        return [
          "Nomor Keputusan",
          "Nama TKA",
          "Tempat/Tanggal Lahir",
          "Kewarganegaraan",
          "Alamat Tempat Tinggal",
          "Nomor Paspor",
          "Jabatan",
          "Lokasi Kerja",
          "Berlaku",
          "Date Issue",
          "Document Type",
        ]
      case "DKPTKA":
        return [
          "Nama Pemberi Kerja",
          "Alamat",
          "No Telepon",
          "Email",
          "Nama TKA",
          "Tempat/Tanggal Lahir",
          "Nomor Paspor",
          "Kewarganegaraan",
          "Jabatan",
          "Lokasi Kerja",
          "Kode Billing Pembayaran",
          "DKPTKA",
          "Document Type",
        ]
      default:
        return [
          "Name",
          "Place of Birth",
          "Date of Birth",
          "Passport No",
          "Passport Expiry",
          "Date Issue",
          "Document Type",
        ]
    }
  }

  const getTableData = () => {
    if (!results || !results.results) return []

    return results.results
      .filter((r) => r.status === "success" && r.data)
      .map((result, index) => ({
        index,
        filename: result.filename,
        ...result.data,
      }))
  }

  // NEW: File count stats (UI Enhancement)
  const getFileStats = () => {
    if (!files) return { total: 0, pdf: 0, size: '0 KB' }
    const total = files.length
    const pdf = Array.from(files).filter(f => f.type === 'application/pdf').length
    const totalSize = Array.from(files).reduce((acc, f) => acc + f.size, 0)
    const sizeStr = totalSize < 1024000 
      ? `${(totalSize / 1024).toFixed(1)} KB`
      : `${(totalSize / 1024 / 1024).toFixed(1)} MB`
    return { total, pdf, size: sizeStr }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Modern Header */}
      <header className="bg-gradient-to-r from-gray-900 via-purple-900 to-gray-900 border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                PDF Extractor Pro
              </h1>
              <p className="text-sm text-gray-400">Advanced Document Processing Tool</p>
            </div>
            <div className="flex items-center gap-3">
              {/* API Status Indicator */}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-400">API Status:</span>
                <span className={`flex items-center gap-1 px-2 py-1 rounded-full ${
                  apiStatus === "online" 
                    ? "bg-green-500/20 text-green-400" 
                    : apiStatus === "offline" 
                      ? "bg-red-500/20 text-red-400"
                      : "bg-yellow-500/20 text-yellow-400"
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    apiStatus === "online" 
                      ? "bg-green-400 animate-pulse" 
                      : apiStatus === "offline" 
                        ? "bg-red-400"
                        : "bg-yellow-400 animate-ping"
                  }`}/>
                  {apiStatus === "online" ? "Online" : apiStatus === "offline" ? "Offline" : "Checking..."}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-gray-800 border border-gray-700">
            <TabsTrigger 
              value="upload" 
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload
            </TabsTrigger>
            <TabsTrigger 
              value="results"
              disabled={!results}
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
            >
              <FileText className="mr-2 h-4 w-4" />
              Results
            </TabsTrigger>
            <TabsTrigger 
              value="export"
              disabled={!results}
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </TabsTrigger>
          </TabsList>

          {/* Upload Tab */}
          <TabsContent value="upload" className="space-y-6">
            {apiStatus === "offline" && (
              <Alert className="bg-red-500/10 border border-red-500/20">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertTitle className="text-red-400">API Connection Error</AlertTitle>
                <AlertDescription className="text-red-300">
                  Cannot connect to the API server. The extraction service may be unavailable.
                </AlertDescription>
              </Alert>
            )}

            {/* Enhanced Upload Card */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Upload PDF Files</CardTitle>
                <CardDescription className="text-gray-400">
                  Select multiple PDF files for extraction and automated processing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Drag & Drop Zone */}
                  <div
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                      isDragging 
                        ? "border-purple-500 bg-purple-500/10" 
                        : "border-gray-700 hover:border-gray-600 hover:bg-gray-800/50"
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                    onDragLeave={() => setIsDragging(false)}
                  >
                    <Upload className="h-16 w-16 text-purple-400 mx-auto mb-4" />
                    <p className="text-xl font-semibold text-white mb-2">
                      {isDragging ? "Drop files here" : "Drag & Drop PDF Files"}
                    </p>
                    <p className="text-gray-400 mb-4">or click to browse</p>
                    
                    <Input
                      ref={fileInputRef}
                      id="pdf-files"
                      type="file"
                      accept=".pdf"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    
                    <Button 
                      type="button" 
                      variant="outline"
                      className="bg-transparent border-purple-500 text-purple-400 hover:bg-purple-500/10"
                    >
                      Select Files
                    </Button>
                  </div>

                  {/* File List Display */}
                  {files && files.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-400">Selected Files</h4>
                        <Badge variant="secondary" className="bg-purple-600/20 text-purple-400 border-purple-600/30">
                          {getFileStats().total} files • {getFileStats().size}
                        </Badge>
                      </div>
                      <div className="grid gap-2 max-h-48 overflow-y-auto">
                        {Array.from(files).map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700"
                          >
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-gray-400" />
                              <span className="text-sm text-gray-300 truncate max-w-xs">
                                {file.name}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Document Type Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="document-type" className="text-gray-300">
                      Document Type
                    </Label>
                    <select
                      id="document-type"
                      value={documentType}
                      onChange={(e) => setDocumentType(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="SKTT">SKTT</option>
                      <option value="EVLN">EVLN</option>
                      <option value="ITAS">ITAS</option>
                      <option value="ITK">ITK</option>
                      <option value="Notifikasi">Notifikasi</option>
                      <option value="DKPTKA">DKPTKA</option>
                    </select>
                  </div>

                  {/* File Rename Options */}
                  <div className="space-y-4 p-4 bg-gray-800/30 rounded-lg border border-gray-700">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="enable-rename"
                        checked={enableFileRename}
                        onChange={(e) => setEnableFileRename(e.target.checked)}
                        className="rounded border-gray-600 text-purple-600 focus:ring-purple-500 bg-gray-700"
                      />
                      <Label htmlFor="enable-rename" className="text-gray-300">
                        Enable File Renaming
                      </Label>
                    </div>

                    {enableFileRename && (
                      <div className="ml-6 space-y-2">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="use-name"
                            checked={useNameForRename}
                            onChange={(e) => setUseNameForRename(e.target.checked)}
                            className="rounded border-gray-600 text-purple-600 focus:ring-purple-500 bg-gray-700"
                          />
                          <Label htmlFor="use-name" className="text-gray-400">
                            Use Name in filename
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="use-passport"
                            checked={usePassportForRename}
                            onChange={(e) => setUsePassportForRename(e.target.checked)}
                            className="rounded border-gray-600 text-purple-600 focus:ring-purple-500 bg-gray-700"
                          />
                          <Label htmlFor="use-passport" className="text-gray-400">
                            Use Passport Number in filename
                          </Label>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={loading || !files || files.length === 0 || apiStatus === "offline"}
                    className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white"
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Extracting Text...
                      </>
                    ) : (
                      <>
                        <FileText className="mr-2 h-5 w-5" />
                        Start Extraction
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results" className="space-y-6">
            {results && (
              <>
                {/* Summary Card */}
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-6 w-6 text-green-400" />
                        <CardTitle className="text-white">Processing Complete</CardTitle>
                      </div>
                      <div className="flex gap-2">
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          {results.processed_files} Processed
                        </Badge>
                        {results.failed_files && results.failed_files > 0 && (
                          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                            {results.failed_files} Failed
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                {/* Renamed Files Display */}
                {results.renamed_files && (
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-white">
                          <FolderOpen className="h-5 w-5 text-green-400" />
                          <span>Renamed Files</span>
                        </CardTitle>
                        <Button
                          onClick={downloadRenamedZip}
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download ZIP
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {Object.entries(results.renamed_files).map(([original, renamed]) => (
                          <div
                            key={original}
                            className="flex items-center justify-between p-3 bg-gray-900 rounded-lg border border-gray-700"
                          >
                            <span className="text-sm text-gray-400 truncate max-w-xs">{original}</span>
                            <div className="flex items-center gap-2">
                              <ChevronDown className="h-4 w-4 text-gray-500 rotate-270" />
                              <span className="text-sm font-medium text-white truncate max-w-xs">{renamed}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Data Table */}
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white">Extracted Data</CardTitle>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          placeholder="Search in results..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 bg-gray-900 border-gray-700 text-white placeholder-gray-500"
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-gray-700">
                            <TableHead className="text-gray-400">No</TableHead>
                            <TableHead className="text-gray-400">Filename</TableHead>
                            {getTableColumns().map((column) => (
                              <TableHead key={column} className="text-gray-400">
                                {column}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getTableData()
                            .filter(row => !searchQuery || 
                              Object.values(row).some(val => 
                                String(val).toLowerCase().includes(searchQuery.toLowerCase())
                              )
                            )
                            .map((row, index) => (
                              <TableRow key={index} className="border-gray-700 hover:bg-gray-800/50">
                                <TableCell className="text-gray-300">{index + 1}</TableCell>
                                <TableCell className="font-medium text-gray-300">{row.filename}</TableCell>
                                {getTableColumns().map((column) => (
                                  <TableCell key={column} className="text-gray-300">
                                    <div className="flex items-center gap-1">
                                      {row[column as keyof typeof row] || "-"}
                                      {row[column as keyof typeof row] && (
                                        <button
                                          onClick={() => copyToClipboard(String(row[column as keyof typeof row]))}
                                          className="opacity-0 hover:opacity-100 transition-opacity"
                                        >
                                          <Copy className="h-3 w-3 text-gray-500" />
                                        </button>
                                      )}
                                    </div>
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Export Tab */}
          <TabsContent value="export" className="space-y-6">
            {results && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Excel Export */}
                {results.download_links?.excel && (
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader className="text-center">
                      <FileSpreadsheet className="h-12 w-12 text-green-400 mx-auto mb-2" />
                      <CardTitle className="text-white">Excel Format</CardTitle>
                      <CardDescription className="text-gray-400">
                        Professional Excel file
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button 
                        onClick={downloadExcelFromBackend} 
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download Excel
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* CSV Export */}
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader className="text-center">
                    <FileSpreadsheet className="h-12 w-12 text-blue-400 mx-auto mb-2" />
                    <CardTitle className="text-white">CSV Format</CardTitle>
                    <CardDescription className="text-gray-400">
                      Excel compatible
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      onClick={downloadAsExcel}
                      variant="outline" 
                      className="w-full bg-transparent border-blue-500 text-blue-400 hover:bg-blue-500/10"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download CSV
                    </Button>
                  </CardContent>
                </Card>

                {/* JSON Export */}
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader className="text-center">
                    <FileText className="h-12 w-12 text-purple-400 mx-auto mb-2" />
                    <CardTitle className="text-white">JSON Format</CardTitle>
                    <CardDescription className="text-gray-400">
                      Raw data export
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      onClick={downloadAllAsJSON}
                      variant="outline" 
                      className="w-full bg-transparent border-purple-500 text-purple-400 hover:bg-purple-500/10"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download JSON
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <footer className="mt-12 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="text-center">
            <p className="text-gray-500 text-sm mt-2">© 2025 Part Of Laman tools • Develop by Sabnreview</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
