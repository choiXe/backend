import boto3
import csv

region='ap-northeast-2'

try:
    ddb = boto3.resource('dynamodb')
    table = ddb.Table('sampleTableName')
    with open('sample.csv') as csv_file:
        csv_reader = csv.reader(csv_file, delimiter=',', quotechar='"')
        with table.batch_writer(['reportIdx']) as batch:
            for row in csv_reader:
                if len(row) == 0:
                    continue
                response = batch.put_item(
                    Item = {
                    'date' : row[0],
                    'stockName': row[1],
                    'stockId': row[2],
                    'reportName': row[3],
                    'priceGoal': row[4],
                    'analyst': row[5],
                    'firm': row[6],
                    'reportIdx': row[7]
                    }
                )
            print('put succeeded:')
except:
    print('An exception occurred')
