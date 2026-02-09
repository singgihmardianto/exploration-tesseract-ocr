# Textract SDK:

## API Function
1. Raw text: extract all text
2. Key value pair: search the value of a Key

## Method

1. Sync: for image -> return json
2. Async: for PDF -> return job id

## Flow

[     S3     ] --------- trigger --------> [  LAMBDA / ECS  ]
                                                    |
                                                    |
                                                    |
                                                    |
                                                    ˅
                                            []



# Solution:

1. Using key value pair
2. Using queries (Analyze API)


