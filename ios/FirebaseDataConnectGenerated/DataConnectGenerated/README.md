This Swift package contains the generated Swift code for the connector `example`.

You can use this package by adding it as a local Swift package dependency in your project.

# Accessing the connector

Add the necessary imports

```
import FirebaseDataConnect
import DataConnectGenerated

```

The connector can be accessed using the following code:

```
let connector = DataConnect.exampleConnector

```


## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code, which can be called from the `init` function of your SwiftUI app

```
connector.useEmulator()
```

# Queries

## ListProjectsForUserQuery


### Using the Query Reference
```
struct MyView: View {
   var listProjectsForUserQueryRef = DataConnect.exampleConnector.listProjectsForUserQuery.ref(...)

  var body: some View {
    VStack {
      if let data = listProjectsForUserQueryRef.data {
        // use data in View
      }
      else {
        Text("Loading...")
      }
    }
    .task {
        do {
          let _ = try await listProjectsForUserQueryRef.execute()
        } catch {
        }
      }
  }
}
```

### One-shot execute
```
DataConnect.exampleConnector.listProjectsForUserQuery.execute(...)
```


# Mutations
## CreateUserMutation

### Variables

#### Required
```swift

let displayName: String = ...
let email: String = ...
```
 

### One-shot execute
```
DataConnect.exampleConnector.createUserMutation.execute(...)
```

## CreateTimeEntryMutation

### Variables

#### Required
```swift

let projectId: UUID = ...
let taskId: UUID = ...
let startTime: Timestamp = ...
let endTime: Timestamp = ...
```
 

#### Optional
```swift

let notes: String = ...
```

### One-shot execute
```
DataConnect.exampleConnector.createTimeEntryMutation.execute(...)
```

## UpdateProjectMutation

### Variables

#### Required
```swift

let id: UUID = ...
```
 

#### Optional
```swift

let name: String = ...
let description: String = ...
let billingRatePerHour: Double = ...
let status: String = ...
```

### One-shot execute
```
DataConnect.exampleConnector.updateProjectMutation.execute(...)
```

