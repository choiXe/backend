# [choiXe](https://www.choixe.app) Backend &middot; [![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](https://github.com/choiXe/choiXe/blob/main/LICENSE)

> AWS Lambda Service used to process the data provided in the choiXe website.

## License & Copyright Notice

This repository has been created as a part of the ongoing development of the [choiXe](https://github.com/choiXe/website) project.

The work in this repository is licensed under the [MIT](https://github.com/choiXe/choiXe/blob/main/LICENSE) license.

Copyright (c) 2021 choiXe team

## Running Locally

### Prerequisites

- Install [Git](https://git-scm.com/)
- Install [aws-cli](https://github.com/aws/aws-cli)
- choiXe [AWS IAM User Credentials](https://aws.amazon.com/iam/)

### Getting started

#### Configure AWS profile with choiXe IAM User Credentials

```
$ aws configure
AWS Access Key ID [None]: YOUR ACCESS KEY
AWS Secret Access Key [None]: YOUR SECRET ACCESS KEY
Default region name [None]: ap-northeast-2
Default output format [None]: json
```

#### Clone the repository

```
$ git clone https://github.com/choiXe/backend.git
```

#### Install dependencies

```
$ cd backend
$ npm install
```

#### Build and run the project

Copy the following test function to index.js.

```
async function test(func, type, startDate) {
    let overview;

    switch (func) {
        case 'main':
            overview = await getMainOverview();
            break;
        case 'stock':
            overview = await getStockOverview(type, startDate);
            break;
        case 'sector':
            overview = await getSectorOverview(type, startDate);
            break;
        case 'favorite':
            overview = await getPriceYield(type);
            break;
        default:
            overview = 'no matching function';
    }
    console.log(overview);
}

test('main');
test('sector', 'IT', '2021-07-01');
test('stock', '011070', '2021-07-01');
test('favorite', '011070,383310,326030');
```

Run following command in terminal.

```
$ cd backend/src/
$ node index.js
```

## Running in AWS Lambda

### Prerequisites

- choiXe [AWS IAM User Credentials](https://aws.amazon.com/iam/)

### Getting started

#### Copy required files to a folder

Create a new folder called **lambdaFunction**.<br>
Copy *node_modules* folder, all files under *backend/src/*, and *package.json* to **lambdaFunction**.

#### Create a .zip file archive

```
$ zip -r lambdaFunction.zip .
```

#### Create AWS Lambda function

Create a new lambda function from AWS console with DynamoDB Query permission.<br>
Upload by clicking **Upload from > .zip file**.

#### Create test event

Event: getMainInfo
```
{
  "field": "getMainInfo"
}
```

Event: getStockInfo
```
{
  "field": "getStockInfo",
  "arguments": {
    "stockId": "035720",
    "startDate": "2021-06-01"
  }
}
```

Event: getSectorInfo
```
{
  "field": "getSectorInfo",
  "arguments": {
    "sectorName": "IT",
    "startDate": "2021-06-01"
  }
}
```

#### Deploy and run the project

Click deploy from AWS Lambda console prior to testing and run Test.

---
