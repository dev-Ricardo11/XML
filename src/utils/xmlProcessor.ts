import { ExcelData, Config, ProcessedXML } from '../types';

export async function processXMLFiles(
  xmlFiles: File[],
  excelData: ExcelData[],
  config: Config
): Promise<ProcessedXML[]> {
  const processedFiles: ProcessedXML[] = [];
  let sequence = 1;

  for (const xmlFile of xmlFiles) {
    const xmlText = await xmlFile.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

    const facturaId = extractFacturaId(xmlDoc);

    const matchingData = excelData.find(row => row.factura === facturaId);

    if (matchingData) {
      const processedXml = processXML(xmlDoc, matchingData, config);
      const filename = generateFilename(sequence, matchingData);

      const serializer = new XMLSerializer();
      const processedXmlString = serializer.serializeToString(processedXml);

      processedFiles.push({
        filename,
        content: formatXML(processedXmlString),
        sequence
      });

      sequence++;
    }
  }

  return processedFiles;
}

function extractFacturaId(xmlDoc: Document): string {
  const idElement = xmlDoc.querySelector('cbc\\:ID, ID');
  return idElement?.textContent?.trim() || '';
}

function processXML(xmlDoc: Document, excelData: ExcelData, config: Config): Document {
  const clonedDoc = xmlDoc.cloneNode(true) as Document;

  const customizationId = clonedDoc.querySelector('Invoice cbc\\:CustomizationID, Invoice CustomizationID');
  if (customizationId && customizationId.textContent === 'SS-CUFE') {
    customizationId.textContent = '11';

    const profileId = clonedDoc.querySelector('Invoice cbc\\:ProfileID, Invoice ProfileID');
    if (profileId) {
      const additionalDocRef = clonedDoc.createElementNS(
        'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
        'cac:AdditionalDocumentReference'
      );
      const id = clonedDoc.createElementNS(
        'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
        'cbc:ID'
      );
      id.textContent = '11';
      additionalDocRef.appendChild(id);

      profileId.parentNode?.insertBefore(additionalDocRef, profileId);
    }
  }

  if (excelData.item === 'servicio') {
    updateDateFields(clonedDoc, excelData.fechaInicio, excelData.fechaFin);
  } else if (excelData.item === 'tiquete') {
    const fechasFromXML = extractHealthSectorDates(clonedDoc);
    if (fechasFromXML.inicio && fechasFromXML.fin) {
      updateDateFields(clonedDoc, fechasFromXML.inicio, fechasFromXML.fin);
    }
  }

  updatePlanBeneficio(clonedDoc, config.planBeneficio);

  return clonedDoc;
}

function extractHealthSectorDates(xmlDoc: Document): { inicio: string; fin: string } {
  const additionalInfos = xmlDoc.querySelectorAll('AdditionalInformation');
  let inicio = '';
  let fin = '';

  additionalInfos.forEach(info => {
    const nameEl = info.querySelector('Name');
    const valueEl = info.querySelector('Value');

    if (nameEl && valueEl) {
      const name = nameEl.textContent?.trim() || '';
      const value = valueEl.textContent?.trim() || '';

      if (name.includes('Fecha de inicio del periodo de facturación') || name.includes('Fecha de inicio')) {
        inicio = value;
      } else if (name.includes('Fecha final del periodo de facturación') || name.includes('Fecha final')) {
        fin = value;
      }
    }
  });

  return { inicio, fin };
}

function updateDateFields(xmlDoc: Document, fechaInicio: string, fechaFin: string) {
  const additionalInfos = xmlDoc.querySelectorAll('AdditionalInformation');

  additionalInfos.forEach(info => {
    const nameEl = info.querySelector('Name');
    const valueEl = info.querySelector('Value');

    if (nameEl && valueEl) {
      const name = nameEl.textContent?.trim() || '';

      if (name.includes('Fecha de inicio del periodo de facturación') || name.includes('Fecha de inicio')) {
        valueEl.textContent = fechaInicio;
      } else if (name.includes('Fecha final del periodo de facturación') || name.includes('Fecha final')) {
        valueEl.textContent = fechaFin;
      }
    }
  });
}

function updatePlanBeneficio(xmlDoc: Document, plan: string) {
  const planBeneficioElements = xmlDoc.querySelectorAll('AdditionalInformation');

  planBeneficioElements.forEach(info => {
    const nameEl = info.querySelector('Name');
    const valueEl = info.querySelector('Value');

    if (nameEl && valueEl) {
      const name = nameEl.textContent?.trim() || '';

      if (name.includes('COBERTURA_PLAN_BENEFICIOS')) {
        const schemeIdAttr = valueEl.getAttribute('schemeID');
        if (schemeIdAttr !== null) {
          valueEl.setAttribute('schemeID', plan);
        }
      }
    }
  });
}

function generateFilename(sequence: number, data: ExcelData): string {
  return `${sequence}_CONTENEDOR(${data.nit};${data.factura};${data.fechaInicio};${data.fechaFin};${data.plan};${data.item.toUpperCase()}).xml`;
}

function formatXML(xmlString: string): string {
  if (xmlString.startsWith('<?xml')) {
    return xmlString;
  }
  return '<?xml version="1.0" encoding="utf-8"?>\n' + xmlString;
}