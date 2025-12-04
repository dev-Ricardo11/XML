import { ExcelData, ProcessedXML, CustomCorrection } from '../types';

export async function processXMLFiles(
  xmlFiles: File[],
  excelData: ExcelData[],
  customCorrections: CustomCorrection[] = []
): Promise<ProcessedXML[]> {
  const processedFiles: ProcessedXML[] = [];
  let sequence = 1;

  console.log('Iniciando procesamiento de', xmlFiles.length, 'archivos XML');
  console.log('Datos del Excel disponibles:', excelData.length, 'registros');
  console.log('Correcciones manuales activas:', customCorrections.filter(c => c.enabled).length);

  for (const xmlFile of xmlFiles) {
    const xmlText = await xmlFile.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

    // Debug: Log root tag
    console.log(`Root tag del archivo ${xmlFile.name}: ${xmlDoc.documentElement.tagName}`);

    // Check if it's an AttachedDocument (Container)
    const isAttachedDocument = xmlDoc.documentElement.localName === 'AttachedDocument';

    let facturaId = '';
    let innerDoc: Document | null = null;
    let innerXmlString = '';
    let hasCdata = false;

    if (isAttachedDocument) {
      console.log('Detectado AttachedDocument (Contenedor). Buscando Factura interna...');

      const attachments = getElementsByLocalName(xmlDoc, 'Attachment');
      if (attachments.length > 0) {
        const externalRefs = getElementsByLocalName(attachments[0], 'ExternalReference');
        if (externalRefs.length > 0) {
          const descriptions = getElementsByLocalName(externalRefs[0], 'Description');
          if (descriptions.length > 0) {
            // Check for CDATA section in the original text
            for (let i = 0; i < descriptions[0].childNodes.length; i++) {
              if (descriptions[0].childNodes[i].nodeType === Node.CDATA_SECTION_NODE) {
                hasCdata = true;
                break;
              }
            }

            innerXmlString = descriptions[0].textContent?.trim() || '';

            // Force CDATA if content looks like XML
            if (innerXmlString.startsWith('<') && innerXmlString.endsWith('>')) {
              hasCdata = true;
            }

            if (innerXmlString) {
              // Parse inner XML
              innerDoc = parser.parseFromString(innerXmlString, 'text/xml');
              facturaId = extractFacturaId(innerDoc);
              console.log(`Factura interna encontrada con ID: ${facturaId}`);
            }
          }
        }
      }

      if (!facturaId) {
        console.warn('No se pudo extraer la factura interna del AttachedDocument');
        facturaId = extractFacturaId(xmlDoc);
      }
    } else {
      // Regular Invoice
      facturaId = extractFacturaId(xmlDoc);
    }

    console.log(`Procesando XML: ${xmlFile.name}, Factura ID para matching: ${facturaId}`);

    const matchingData = excelData.find(row =>
      row.factura === facturaId || row.nit === facturaId
    );

    if (matchingData) {
      console.log('✓ Match encontrado:', matchingData);

      let finalXmlString = '';

      if (isAttachedDocument && innerDoc && innerXmlString) {
        // Process the inner Invoice
        const processedInnerDoc = processXML(innerDoc, matchingData);
        const serializer = new XMLSerializer();
        const processedInnerXmlString = serializer.serializeToString(processedInnerDoc);

        // Update the Container with the processed inner XML
        const attachments = getElementsByLocalName(xmlDoc, 'Attachment');
        const externalRefs = getElementsByLocalName(attachments[0], 'ExternalReference');
        const description = getElementsByLocalName(externalRefs[0], 'Description')[0];

        if (hasCdata) {
          console.log('Reconstruyendo CDATA para la factura interna...');
          const cdata = xmlDoc.createCDATASection(processedInnerXmlString);
          description.textContent = ''; // Clear existing
          description.appendChild(cdata);
        } else {
          description.textContent = processedInnerXmlString;
        }

        finalXmlString = serializer.serializeToString(xmlDoc);

      } else {
        // Process regular Invoice
        const processedXml = processXML(xmlDoc, matchingData);
        const serializer = new XMLSerializer();
        finalXmlString = serializer.serializeToString(processedXml);
      }

      const filename = generateFilename(sequence, matchingData);

      processedFiles.push({
        filename,
        content: formatXML(finalXmlString),
        sequence
      });

      sequence++;
    } else {
      console.warn(`✗ No se encontró match para factura: ${facturaId} en el archivo ${xmlFile.name}`);
    }
  }

  console.log(`Procesamiento completado: ${processedFiles.length} archivos procesados de ${xmlFiles.length}`);
  return processedFiles;
}

// Helper to find elements ignoring namespace prefixes
function getElementsByLocalName(doc: Document | Element, localName: string): Element[] {
  const all = doc.getElementsByTagName('*');
  const matches: Element[] = [];
  for (let i = 0; i < all.length; i++) {
    if (all[i].localName === localName) {
      matches.push(all[i]);
    }
  }
  return matches;
}

function extractFacturaId(xmlDoc: Document): string {
  const idTags = getElementsByLocalName(xmlDoc, 'ID');
  if (idTags.length > 0) return idTags[0].textContent?.trim() || '';
  return '';
}

function processXML(xmlDoc: Document, excelData: ExcelData): Document {
  const clonedDoc = xmlDoc.cloneNode(true) as Document;

  console.log('--- Procesando XML (Invoice) con datos del Excel:', JSON.stringify(excelData, null, 2));

  // Update CustomizationID
  const customizationTags = getElementsByLocalName(clonedDoc, 'CustomizationID');
  if (customizationTags.length > 0) {
    const customizationId = customizationTags[0];
    const currentVal = customizationId.textContent?.trim();
    console.log(`CustomizationID actual: "${currentVal}"`);

    // Check for SS-CUFE OR 11
    if (currentVal && (currentVal.toUpperCase() === 'SS-CUFE' || currentVal === '11')) {

      console.log('Actualizando CustomizationID a SS-CUFE');
      customizationId.textContent = 'SS-CUFE';

      const profileTags = getElementsByLocalName(clonedDoc, 'ProfileID');
      if (profileTags.length > 0) {
        const profileId = profileTags[0];

        // Check if AdditionalDocumentReference with ID 11 already exists
        let linesExist = false;
        const refs = getElementsByLocalName(clonedDoc, 'AdditionalDocumentReference');
        for (let i = 0; i < refs.length; i++) {
          const ids = getElementsByLocalName(refs[i], 'ID');
          if (ids.length > 0 && ids[0].textContent === '11') {
            linesExist = true;
            break;
          }
        }

        if (!linesExist) {
          const additionalDocRef = clonedDoc.createElementNS(
            'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
            'cac:AdditionalDocumentReference'
          );
          const id = clonedDoc.createElementNS(
            'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
            'cbc:ID'
          );
          id.textContent = '11';

          // Formatting: Add newline and indentation for ID inside AdditionalDocumentReference
          additionalDocRef.appendChild(clonedDoc.createTextNode('\n    '));
          additionalDocRef.appendChild(id);
          additionalDocRef.appendChild(clonedDoc.createTextNode('\n'));

          if (profileId.parentNode) {
            // Add newline before the new block for separation
            profileId.parentNode.insertBefore(clonedDoc.createTextNode('\n'), profileId);
            profileId.parentNode.insertBefore(additionalDocRef, profileId);
            console.log('Se agregaron las líneas de referencia (AdditionalDocumentReference) antes de ProfileID');
          }
        } else {
          console.log('Las líneas de referencia (ID 11) ya existen. No se duplicarán.');
        }
      } else {
        console.warn('No se encontró ProfileID para insertar AdditionalDocumentReference');
      }
    } else {
      console.log(`CustomizationID "${currentVal}" no es SS-CUFE ni 11. No se realizarán cambios de contingencia.`);
    }
  } else {
    console.warn('No se encontró CustomizationID en el Invoice interno');
  }

  // Update dates based on item type
  const itemType = excelData.item?.toLowerCase().trim();
  console.log(`Tipo de item detectado: "${itemType}"`);

  if (itemType === 'servicio' || itemType === 'servicios') {
    console.log('Item es servicio, actualizando fechas desde Excel...');
    updateDateFields(clonedDoc, excelData.fechaInicio, excelData.fechaFin);
  } else if (itemType === 'tiquete' || itemType === 'tiquetes') {
    console.log('Item es tiquete, extrayendo fechas del XML...');
    const fechasFromXML = extractHealthSectorDates(clonedDoc);
    if (fechasFromXML.inicio && fechasFromXML.fin) {
      updateDateFields(clonedDoc, fechasFromXML.inicio, fechasFromXML.fin);
    } else {
      console.warn('No se pudieron extraer fechas del sector salud para Tiquete');
    }
  } else {
    console.warn(`⚠️ Tipo de item no reconocido: "${itemType}". No se actualizarán las fechas.`);
    if (excelData.fechaInicio && excelData.fechaFin) {
      console.log('Intentando actualización forzada de fechas usando datos del Excel...');
      updateDateFields(clonedDoc, excelData.fechaInicio, excelData.fechaFin);
    }
  }

  // Update plan beneficio from Excel data
  if (excelData.plan) {
    // Ensure plan is 2 digits (e.g. "1" -> "01")
    const planFormatted = excelData.plan.trim().padStart(2, '0');
    updatePlanBeneficio(clonedDoc, planFormatted);
  } else {
    console.warn('⚠️ El campo "plan" está vacío en el Excel. No se actualizará el plan beneficio.');
  }

  return clonedDoc;
}

// Apply custom manual corrections to XML string
export function applyCustomCorrections(xmlString: string, corrections: CustomCorrection[]): string {
  let result = xmlString;

  const enabledCorrections = corrections.filter(c => c.enabled && c.searchText && c.replaceText);

  if (enabledCorrections.length === 0) {
    return result;
  }

  console.log(`Aplicando ${enabledCorrections.length} correcciones manuales...`);

  enabledCorrections.forEach((correction, index) => {
    const beforeCount = (result.match(new RegExp(escapeRegExp(correction.searchText), 'g')) || []).length;
    result = result.split(correction.searchText).join(correction.replaceText);
    const afterCount = (result.match(new RegExp(escapeRegExp(correction.replaceText), 'g')) || []).length - beforeCount;

    if (afterCount > 0) {
      console.log(`  ✓ Corrección #${index + 1}: ${afterCount} reemplazos realizados`);
    } else {
      console.log(`  ○ Corrección #${index + 1}: Texto no encontrado`);
    }
  });

  return result;
}

// Helper function to escape special regex characters
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractHealthSectorDates(xmlDoc: Document): { inicio: string; fin: string } {
  const additionalInfos = getElementsByLocalName(xmlDoc, 'AdditionalInformation');
  let inicio = '';
  let fin = '';

  for (let i = 0; i < additionalInfos.length; i++) {
    const info = additionalInfos[i];
    const nameTags = getElementsByLocalName(info, 'Name');
    const valueTags = getElementsByLocalName(info, 'Value');

    if (nameTags.length > 0 && valueTags.length > 0) {
      const name = nameTags[0].textContent?.trim() || '';
      const value = valueTags[0].textContent?.trim() || '';

      if (name.includes('Fecha de inicio del periodo de facturación') || name.includes('Fecha de inicio')) {
        inicio = value;
      } else if (name.includes('Fecha final del periodo de facturación') || name.includes('Fecha final')) {
        fin = value;
      }
    }
  }

  return { inicio, fin };
}

function updateDateFields(xmlDoc: Document, fechaInicio: string, fechaFin: string) {
  const convertDate = (dateStr: string): string => {
    if (!dateStr) return '';
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return dateStr;
  };

  const startDate = convertDate(fechaInicio);
  const endDate = convertDate(fechaFin);

  console.log(`Actualizando fechas: ${fechaInicio} -> ${startDate}, ${fechaFin} -> ${endDate}`);

  const invoicePeriods = getElementsByLocalName(xmlDoc, 'InvoicePeriod');

  if (invoicePeriods.length > 0) {
    const invoicePeriod = invoicePeriods[0];

    const startDates = getElementsByLocalName(invoicePeriod, 'StartDate');
    const endDates = getElementsByLocalName(invoicePeriod, 'EndDate');

    if (startDates.length > 0) {
      console.log(`Cambiando StartDate de "${startDates[0].textContent}" a "${startDate}"`);
      startDates[0].textContent = startDate;
    } else {
      console.warn('No se encontró StartDate dentro de InvoicePeriod');
    }

    if (endDates.length > 0) {
      console.log(`Cambiando EndDate de "${endDates[0].textContent}" a "${endDate}"`);
      endDates[0].textContent = endDate;
    } else {
      console.warn('No se encontró EndDate dentro de InvoicePeriod');
    }
  } else {
    console.warn('No se encontró InvoicePeriod en el XML (usando getElementsByLocalName)');
  }
}

function updatePlanBeneficio(xmlDoc: Document, plan: string) {
  console.log(`Buscando COBERTURA_PLAN_BENEFICIOS para actualizar a plan: ${plan}`);

  const additionalInfos = getElementsByLocalName(xmlDoc, 'AdditionalInformation');
  let found = false;

  for (let i = 0; i < additionalInfos.length; i++) {
    const info = additionalInfos[i];
    const nameTags = getElementsByLocalName(info, 'Name');
    const valueTags = getElementsByLocalName(info, 'Value');

    if (nameTags.length > 0 && valueTags.length > 0) {
      const name = nameTags[0].textContent?.trim() || '';

      if (name.includes('COBERTURA_PLAN_BENEFICIOS')) {
        const valueEl = valueTags[0];
        const oldSchemeId = valueEl.getAttribute('schemeID');
        console.log(`Encontrado COBERTURA_PLAN_BENEFICIOS, schemeID actual: "${oldSchemeId}", nuevo: "${plan}"`);
        valueEl.setAttribute('schemeID', plan);
        found = true;
      }
    }
  }

  if (!found) {
    console.warn('No se encontró COBERTURA_PLAN_BENEFICIOS en el XML (usando getElementsByLocalName)');
  }
}

function generateFilename(sequence: number, data: ExcelData): string {
  const planFormatted = data.plan.trim().padStart(2, '0');
  return `${sequence}_CONTENEDOR(${data.nit};${data.factura};${data.fechaInicio};${data.fechaFin};${planFormatted};${data.item.toUpperCase()}).xml`;
}

function formatXML(xmlString: string): string {
  if (xmlString.startsWith('<?xml')) {
    return xmlString;
  }
  return '<?xml version="1.0" encoding="utf-8"?>\n' + xmlString;
}