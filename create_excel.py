import xlsxwriter

# Create a new Excel file and add a worksheet.
workbook = xlsxwriter.Workbook('Workouts.xlsx')
worksheet = workbook.add_worksheet('Sheet1')

# Add some data.
worksheet.write('A1', 'Exercise')
worksheet.write('B1', 'Sets')
worksheet.write('C1', 'Reps')
worksheet.write('D1', 'Weight')
worksheet.write('E1', 'Progression')

worksheet.write('A2', 'Squats')
worksheet.write('B2', 3)
worksheet.write('C2', 10)
worksheet.write('D2', 100)
worksheet.write('E2', '5x5')

worksheet.write('A3', 'Bench Press')
worksheet.write('B3', 3)
worksheet.write('C3', 8)
worksheet.write('D3', 150)
worksheet.write('E3', 'Increase weight by 5 lbs')

workbook.close()
