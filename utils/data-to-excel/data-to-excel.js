const excel = require('excel4node');

const { alignment } = require('excel4node/distribution/lib/types');
const { horizontal } = require('excel4node/distribution/lib/types/alignment');
const { red } = require('excel4node/distribution/lib/types/excelColor');

const dataHeaders = ['N', 'Идентификатор Книги', 'Идентификатор Языка', 'Глава', 'Тип контента'];
// const title = 'Table';

async function dataToExcel(title, data, excelFileName = 'result.xlsx', isError = false) {
  // console.log(data);
  let dateTime = new Date().toLocaleString();

  try {
    const workbook = new excel.Workbook();
    const worksheet = workbook.addWorksheet(title);

    const headerStyle = workbook.createStyle({
      font: { bold: true },
      fill: { type: 'pattern', patternType: 'solid', fgColor: '#D3D3D3' },
      alignment: { horizontal: 'center' }
    });

    const titleStyle = isError ? workbook.createStyle({
      font: { bold: true, size: 16, color: red },
      // alignment: { horizontal: 'center' }
    }) :
      workbook.createStyle({
        font: { bold: true, size: 16, color: red },
        // alignment: { horizontal: 'center' }
      });

    const cellsStyle = workbook.createStyle({
      alignment: { horizontal: 'center' }
    });

    worksheet.cell(1, 1, 1, dataHeaders.length, true)
      .string(`${dateTime}  ${title}`)
      .style(titleStyle);


    worksheet.row(2).freeze();

    dataHeaders.forEach((col, index) => {
      worksheet.cell(2, index + 1)
        .string(col)
        .style(headerStyle);
    });

    const columnWidths = dataHeaders.reduce((acc, col) => {
      acc[col] = col.length + 2;
      return acc;
    }, {});

    // console.log(columnWidths);
    let rowIndex = 3;

    let counter = 1;


    for (const row of data) {
      // if (counter > 10) break;
      // console.log("INDEX: " + counter);
      worksheet.cell(rowIndex, 1).number(counter).style(cellsStyle);
      Object.values(row).forEach((cellValue, idx) => {
        // console.log(idx + ': ');
        // console.log(cellValue);
        let contentLength = 0;

        try {
          const cell = worksheet.cell(rowIndex, idx + 2);
          let stringValue = '';

          if (cellValue === null || cellValue === undefined) {
            cell.string('-').style(cellsStyle);
          } else if (typeof cellValue === 'boolean') {
            cellValue ? cell.string('Словарь').style(cellsStyle) : cell.string('Глава').style(cellsStyle);
            // cell.bool(cellValue).style(cellsStyle);
            stringValue = cellValue.toString();
          } else if (cellValue instanceof Date) {
            cell.date(cellValue).style({ numberFormat: 'yyyy-mm-dd hh:mm:ss' }).style(cellsStyle);
            stringValue = cellValue.toISOString();
          } else if (typeof cellValue === 'number') {
            cell.number(cellValue).style(cellsStyle);
            stringValue = cellValue.toString();
          } else {
            stringValue = cellValue.toString();
            cell.string(stringValue).style(cellsStyle);
          }

          contentLength = stringValue.length;
        } catch (error) {
          console.error(`Ошибка в строке ${rowIndex}, столбец ${colName}:`, error.message);
          worksheet.cell(rowIndex, idx + 2).string('ERROR');
          contentLength = 5;
        }
        // if (contentLength > columnWidths[colName]) {
        //   columnWidths[colName] = contentLength;
        // }


      });

      counter++;
      rowIndex++;


    };

    dataHeaders.forEach((col, index) => {
      worksheet.column(index + 1).setWidth((columnWidths[col] + 2) * 1.5);
    });
    dateTime = dateTime.replaceAll(':', '-');

    function getCorrectWord(moduleCount) {
      const n = Math.abs(moduleCount) % 100;            
      const lastDigit = n % 10;
      if (n >= 11 && n <= 14) return 'модулей';
      switch (lastDigit) {
        case 1:
          return 'модуль';          
        case 2:
        case 3:
        case 4:    
          return 'модуля';          
        default:
          return 'модулей';    
      }
    }
    worksheet.cell(rowIndex + 3, 2).string(`Итого: ${rowIndex - 3} ${getCorrectWord(rowIndex - 3)}`).style(headerStyle);

    await workbook.write(`${excelFileName}__${dateTime}.xlsx`);

  } catch (error) {
    console.log('Error in dataToExcel ', error);
  }
}

// dataToExcel(data, excelFileName);

module.exports = dataToExcel;