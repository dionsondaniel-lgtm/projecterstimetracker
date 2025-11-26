
import Foundation

import FirebaseCore
import FirebaseDataConnect
public extension DataConnect {

  static let exampleConnector: ExampleConnector = {
    let dc = DataConnect.dataConnect(connectorConfig: ExampleConnector.connectorConfig, callerSDKType: .generated)
    return ExampleConnector(dataConnect: dc)
  }()

}

public class ExampleConnector {

  let dataConnect: DataConnect

  public static let connectorConfig = ConnectorConfig(serviceId: "time-tracker-app", location: "us-east4", connector: "example")

  init(dataConnect: DataConnect) {
    self.dataConnect = dataConnect

    // init operations 
    self.createUserMutation = CreateUserMutation(dataConnect: dataConnect)
    self.listProjectsForUserQuery = ListProjectsForUserQuery(dataConnect: dataConnect)
    self.createTimeEntryMutation = CreateTimeEntryMutation(dataConnect: dataConnect)
    self.updateProjectMutation = UpdateProjectMutation(dataConnect: dataConnect)
    
  }

  public func useEmulator(host: String = DataConnect.EmulatorDefaults.host, port: Int = DataConnect.EmulatorDefaults.port) {
    self.dataConnect.useEmulator(host: host, port: port)
  }

  // MARK: Operations
public let createUserMutation: CreateUserMutation
public let listProjectsForUserQuery: ListProjectsForUserQuery
public let createTimeEntryMutation: CreateTimeEntryMutation
public let updateProjectMutation: UpdateProjectMutation


}
