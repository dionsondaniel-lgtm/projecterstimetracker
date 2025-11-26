import Foundation

import FirebaseCore
import FirebaseDataConnect




















// MARK: Common Enums

public enum OrderDirection: String, Codable, Sendable {
  case ASC = "ASC"
  case DESC = "DESC"
  }

public enum SearchQueryFormat: String, Codable, Sendable {
  case QUERY = "QUERY"
  case PLAIN = "PLAIN"
  case PHRASE = "PHRASE"
  case ADVANCED = "ADVANCED"
  }


// MARK: Connector Enums

// End enum definitions









public class CreateUserMutation{

  let dataConnect: DataConnect

  init(dataConnect: DataConnect) {
    self.dataConnect = dataConnect
  }

  public static let OperationName = "CreateUser"

  public typealias Ref = MutationRef<CreateUserMutation.Data,CreateUserMutation.Variables>

  public struct Variables: OperationVariable {
  
        
        public var
displayName: String

  
        
        public var
email: String


    
    
    
    public init (
        
displayName: String
,
        
email: String

        
        ) {
        self.displayName = displayName
        self.email = email
        

        
    }

    public static func == (lhs: Variables, rhs: Variables) -> Bool {
      
        return lhs.displayName == rhs.displayName && 
              lhs.email == rhs.email
              
    }

    
public func hash(into hasher: inout Hasher) {
  
  hasher.combine(displayName)
  
  hasher.combine(email)
  
}

    enum CodingKeys: String, CodingKey {
      
      case displayName
      
      case email
      
    }

    public func encode(to encoder: Encoder) throws {
      var container = encoder.container(keyedBy: CodingKeys.self)
      let codecHelper = CodecHelper<CodingKeys>()
      
      
      try codecHelper.encode(displayName, forKey: .displayName, container: &container)
      
      
      
      try codecHelper.encode(email, forKey: .email, container: &container)
      
      
    }

  }

  public struct Data: Decodable, Sendable {



public var 
user_insert: UserKey

  }

  public func ref(
        
displayName: String
,
email: String

        ) -> MutationRef<CreateUserMutation.Data,CreateUserMutation.Variables>  {
        var variables = CreateUserMutation.Variables(displayName:displayName,email:email)
        

        let ref = dataConnect.mutation(name: "CreateUser", variables: variables, resultsDataType:CreateUserMutation.Data.self)
        return ref as MutationRef<CreateUserMutation.Data,CreateUserMutation.Variables>
   }

  @MainActor
   public func execute(
        
displayName: String
,
email: String

        ) async throws -> OperationResult<CreateUserMutation.Data> {
        var variables = CreateUserMutation.Variables(displayName:displayName,email:email)
        
        
        let ref = dataConnect.mutation(name: "CreateUser", variables: variables, resultsDataType:CreateUserMutation.Data.self)
        
        return try await ref.execute()
        
   }
}






public class ListProjectsForUserQuery{

  let dataConnect: DataConnect

  init(dataConnect: DataConnect) {
    self.dataConnect = dataConnect
  }

  public static let OperationName = "ListProjectsForUser"

  public typealias Ref = QueryRefObservation<ListProjectsForUserQuery.Data,ListProjectsForUserQuery.Variables>

  public struct Variables: OperationVariable {

    
    
  }

  public struct Data: Decodable, Sendable {




public struct Project: Decodable, Sendable ,Hashable, Equatable, Identifiable {
  


public var 
id: UUID



public var 
name: String



public var 
description: String?


  
  public var projectKey: ProjectKey {
    return ProjectKey(
      
      id: id
    )
  }

  
public func hash(into hasher: inout Hasher) {
  
  hasher.combine(id)
  
}
public static func == (lhs: Project, rhs: Project) -> Bool {
    
    return lhs.id == rhs.id 
        
  }

  

  
  enum CodingKeys: String, CodingKey {
    
    case id
    
    case name
    
    case description
    
  }

  public init(from decoder: any Decoder) throws {
    var container = try decoder.container(keyedBy: CodingKeys.self)
    let codecHelper = CodecHelper<CodingKeys>()

    
    
    self.id = try codecHelper.decode(UUID.self, forKey: .id, container: &container)
    
    
    
    self.name = try codecHelper.decode(String.self, forKey: .name, container: &container)
    
    
    
    self.description = try codecHelper.decode(String?.self, forKey: .description, container: &container)
    
    
  }
}
public var 
projects: [Project]

  }

  public func ref(
        
        ) -> QueryRefObservation<ListProjectsForUserQuery.Data,ListProjectsForUserQuery.Variables>  {
        var variables = ListProjectsForUserQuery.Variables()
        

        let ref = dataConnect.query(name: "ListProjectsForUser", variables: variables, resultsDataType:ListProjectsForUserQuery.Data.self, publisher: .observableMacro)
        return ref as! QueryRefObservation<ListProjectsForUserQuery.Data,ListProjectsForUserQuery.Variables>
   }

  @MainActor
   public func execute(
        
        ) async throws -> OperationResult<ListProjectsForUserQuery.Data> {
        var variables = ListProjectsForUserQuery.Variables()
        
        
        let ref = dataConnect.query(name: "ListProjectsForUser", variables: variables, resultsDataType:ListProjectsForUserQuery.Data.self, publisher: .observableMacro)
        
        let refCast = ref as! QueryRefObservation<ListProjectsForUserQuery.Data,ListProjectsForUserQuery.Variables>
        return try await refCast.execute()
        
   }
}






public class CreateTimeEntryMutation{

  let dataConnect: DataConnect

  init(dataConnect: DataConnect) {
    self.dataConnect = dataConnect
  }

  public static let OperationName = "CreateTimeEntry"

  public typealias Ref = MutationRef<CreateTimeEntryMutation.Data,CreateTimeEntryMutation.Variables>

  public struct Variables: OperationVariable {
  
        
        public var
projectId: UUID

  
        
        public var
taskId: UUID

  
        
        public var
startTime: Timestamp

  
        
        public var
endTime: Timestamp

  
        @OptionalVariable
        public var
notes: String?


    
    
    
    public init (
        
projectId: UUID
,
        
taskId: UUID
,
        
startTime: Timestamp
,
        
endTime: Timestamp

        
        
        ,
        _ optionalVars: ((inout Variables)->())? = nil
        ) {
        self.projectId = projectId
        self.taskId = taskId
        self.startTime = startTime
        self.endTime = endTime
        

        
        if let optionalVars {
            optionalVars(&self)
        }
        
    }

    public static func == (lhs: Variables, rhs: Variables) -> Bool {
      
        return lhs.projectId == rhs.projectId && 
              lhs.taskId == rhs.taskId && 
              lhs.startTime == rhs.startTime && 
              lhs.endTime == rhs.endTime && 
              lhs.notes == rhs.notes
              
    }

    
public func hash(into hasher: inout Hasher) {
  
  hasher.combine(projectId)
  
  hasher.combine(taskId)
  
  hasher.combine(startTime)
  
  hasher.combine(endTime)
  
  hasher.combine(notes)
  
}

    enum CodingKeys: String, CodingKey {
      
      case projectId
      
      case taskId
      
      case startTime
      
      case endTime
      
      case notes
      
    }

    public func encode(to encoder: Encoder) throws {
      var container = encoder.container(keyedBy: CodingKeys.self)
      let codecHelper = CodecHelper<CodingKeys>()
      
      
      try codecHelper.encode(projectId, forKey: .projectId, container: &container)
      
      
      
      try codecHelper.encode(taskId, forKey: .taskId, container: &container)
      
      
      
      try codecHelper.encode(startTime, forKey: .startTime, container: &container)
      
      
      
      try codecHelper.encode(endTime, forKey: .endTime, container: &container)
      
      
      if $notes.isSet { 
      try codecHelper.encode(notes, forKey: .notes, container: &container)
      }
      
    }

  }

  public struct Data: Decodable, Sendable {



public var 
timeEntry_insert: TimeEntryKey

  }

  public func ref(
        
projectId: UUID
,
taskId: UUID
,
startTime: Timestamp
,
endTime: Timestamp

        
        ,
        _ optionalVars: ((inout CreateTimeEntryMutation.Variables)->())? = nil
        ) -> MutationRef<CreateTimeEntryMutation.Data,CreateTimeEntryMutation.Variables>  {
        var variables = CreateTimeEntryMutation.Variables(projectId:projectId,taskId:taskId,startTime:startTime,endTime:endTime)
        
        if let optionalVars {
            optionalVars(&variables)
        }
        

        let ref = dataConnect.mutation(name: "CreateTimeEntry", variables: variables, resultsDataType:CreateTimeEntryMutation.Data.self)
        return ref as MutationRef<CreateTimeEntryMutation.Data,CreateTimeEntryMutation.Variables>
   }

  @MainActor
   public func execute(
        
projectId: UUID
,
taskId: UUID
,
startTime: Timestamp
,
endTime: Timestamp

        
        ,
        _ optionalVars: (@MainActor (inout CreateTimeEntryMutation.Variables)->())? = nil
        ) async throws -> OperationResult<CreateTimeEntryMutation.Data> {
        var variables = CreateTimeEntryMutation.Variables(projectId:projectId,taskId:taskId,startTime:startTime,endTime:endTime)
        
        if let optionalVars {
            optionalVars(&variables)
        }
        
        
        let ref = dataConnect.mutation(name: "CreateTimeEntry", variables: variables, resultsDataType:CreateTimeEntryMutation.Data.self)
        
        return try await ref.execute()
        
   }
}






public class UpdateProjectMutation{

  let dataConnect: DataConnect

  init(dataConnect: DataConnect) {
    self.dataConnect = dataConnect
  }

  public static let OperationName = "UpdateProject"

  public typealias Ref = MutationRef<UpdateProjectMutation.Data,UpdateProjectMutation.Variables>

  public struct Variables: OperationVariable {
  
        
        public var
id: UUID

  
        @OptionalVariable
        public var
name: String?

  
        @OptionalVariable
        public var
description: String?

  
        @OptionalVariable
        public var
billingRatePerHour: Double?

  
        @OptionalVariable
        public var
status: String?


    
    
    
    public init (
        
id: UUID

        
        
        ,
        _ optionalVars: ((inout Variables)->())? = nil
        ) {
        self.id = id
        

        
        if let optionalVars {
            optionalVars(&self)
        }
        
    }

    public static func == (lhs: Variables, rhs: Variables) -> Bool {
      
        return lhs.id == rhs.id && 
              lhs.name == rhs.name && 
              lhs.description == rhs.description && 
              lhs.billingRatePerHour == rhs.billingRatePerHour && 
              lhs.status == rhs.status
              
    }

    
public func hash(into hasher: inout Hasher) {
  
  hasher.combine(id)
  
  hasher.combine(name)
  
  hasher.combine(description)
  
  hasher.combine(billingRatePerHour)
  
  hasher.combine(status)
  
}

    enum CodingKeys: String, CodingKey {
      
      case id
      
      case name
      
      case description
      
      case billingRatePerHour
      
      case status
      
    }

    public func encode(to encoder: Encoder) throws {
      var container = encoder.container(keyedBy: CodingKeys.self)
      let codecHelper = CodecHelper<CodingKeys>()
      
      
      try codecHelper.encode(id, forKey: .id, container: &container)
      
      
      if $name.isSet { 
      try codecHelper.encode(name, forKey: .name, container: &container)
      }
      
      if $description.isSet { 
      try codecHelper.encode(description, forKey: .description, container: &container)
      }
      
      if $billingRatePerHour.isSet { 
      try codecHelper.encode(billingRatePerHour, forKey: .billingRatePerHour, container: &container)
      }
      
      if $status.isSet { 
      try codecHelper.encode(status, forKey: .status, container: &container)
      }
      
    }

  }

  public struct Data: Decodable, Sendable {



public var 
project_update: ProjectKey?

  }

  public func ref(
        
id: UUID

        
        ,
        _ optionalVars: ((inout UpdateProjectMutation.Variables)->())? = nil
        ) -> MutationRef<UpdateProjectMutation.Data,UpdateProjectMutation.Variables>  {
        var variables = UpdateProjectMutation.Variables(id:id)
        
        if let optionalVars {
            optionalVars(&variables)
        }
        

        let ref = dataConnect.mutation(name: "UpdateProject", variables: variables, resultsDataType:UpdateProjectMutation.Data.self)
        return ref as MutationRef<UpdateProjectMutation.Data,UpdateProjectMutation.Variables>
   }

  @MainActor
   public func execute(
        
id: UUID

        
        ,
        _ optionalVars: (@MainActor (inout UpdateProjectMutation.Variables)->())? = nil
        ) async throws -> OperationResult<UpdateProjectMutation.Data> {
        var variables = UpdateProjectMutation.Variables(id:id)
        
        if let optionalVars {
            optionalVars(&variables)
        }
        
        
        let ref = dataConnect.mutation(name: "UpdateProject", variables: variables, resultsDataType:UpdateProjectMutation.Data.self)
        
        return try await ref.execute()
        
   }
}


