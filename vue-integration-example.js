// Exemplo de como ajustar o código Vue para funcionar corretamente

// No seu componente Vue, ajuste assim:

onMounted(async () => {
  device.value = await getDevice()

  document.addEventListener("paste", handlePaste)
  isElectron.value = typeof window.electronAPI !== "undefined"

  if (isElectron.value) {
    // CORREÇÃO: Armazena o handler retornado
    scannerHandler = window.electronAPI.onScannerResponse(handleScannerResponse)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener("paste", handlePaste)
  if (isElectron.value && scannerHandler) {
    // CORREÇÃO: Usa o handler armazenado para remover
    window.electronAPI.removeScannerResponseListener(scannerHandler)
  }
})

// Adicione uma variável para armazenar o handler:
let scannerHandler = null

// O resto do código permanece igual:
function handleScannerResponse(response) {
  loading.value = false
  if (response.success) {
    const base64Data = response.base64

    const blob = base64ToBlob(base64Data, "application/pdf")
    const file = new File([blob], `scan_${Date.now()}.pdf`, {
      type: "application/pdf"
    })

    adicionarArquivo(file)
    startLog("Escaneamento concluído e arquivo adicionado.")
  } else {
    if (response.error === "Scanner não conectado") {
      swalErro(
        "Erro Scanner",
        "Por favor, conecte o scanner e tente novamente."
      )
    } else if (response.error === "Nenhuma página escaneada") {
      swalErro("Aviso", "Nenhuma página foi capturada no scanner.")
    } else {
      swalErro("Erro", response.error)
    }
  }
}

function iniciarScanner() {
  if (!isElectron.value) return
  startLog("Iniciando escaneamento...")
  loading.value = true
  window.electronAPI.startScanner(duplex.value)
}