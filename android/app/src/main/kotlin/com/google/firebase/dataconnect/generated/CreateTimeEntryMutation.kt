
@file:kotlin.Suppress(
  "KotlinRedundantDiagnosticSuppress",
  "LocalVariableName",
  "MayBeConstant",
  "RedundantVisibilityModifier",
  "RemoveEmptyClassBody",
  "SpellCheckingInspection",
  "LocalVariableName",
  "unused",
)

package com.google.firebase.dataconnect.generated



public interface CreateTimeEntryMutation :
    com.google.firebase.dataconnect.generated.GeneratedMutation<
      ExampleConnector,
      CreateTimeEntryMutation.Data,
      CreateTimeEntryMutation.Variables
    >
{
  
    @kotlinx.serialization.Serializable
  public data class Variables(
  
    val projectId: @kotlinx.serialization.Serializable(with = com.google.firebase.dataconnect.serializers.UUIDSerializer::class) java.util.UUID,
    val taskId: @kotlinx.serialization.Serializable(with = com.google.firebase.dataconnect.serializers.UUIDSerializer::class) java.util.UUID,
    val startTime: @kotlinx.serialization.Serializable(with = com.google.firebase.dataconnect.serializers.TimestampSerializer::class) com.google.firebase.Timestamp,
    val endTime: @kotlinx.serialization.Serializable(with = com.google.firebase.dataconnect.serializers.TimestampSerializer::class) com.google.firebase.Timestamp,
    val notes: com.google.firebase.dataconnect.OptionalVariable<String?>
  ) {
    
    
      
      @kotlin.DslMarker public annotation class BuilderDsl

      @BuilderDsl
      public interface Builder {
        public var projectId: java.util.UUID
        public var taskId: java.util.UUID
        public var startTime: com.google.firebase.Timestamp
        public var endTime: com.google.firebase.Timestamp
        public var notes: String?
        
      }

      public companion object {
        @Suppress("NAME_SHADOWING")
        public fun build(
          projectId: java.util.UUID,taskId: java.util.UUID,startTime: com.google.firebase.Timestamp,endTime: com.google.firebase.Timestamp,
          block_: Builder.() -> Unit
        ): Variables {
          var projectId= projectId
            var taskId= taskId
            var startTime= startTime
            var endTime= endTime
            var notes: com.google.firebase.dataconnect.OptionalVariable<String?> =
                com.google.firebase.dataconnect.OptionalVariable.Undefined
            

          return object : Builder {
            override var projectId: java.util.UUID
              get() = throw UnsupportedOperationException("getting builder values is not supported")
              set(value_) { projectId = value_ }
              
            override var taskId: java.util.UUID
              get() = throw UnsupportedOperationException("getting builder values is not supported")
              set(value_) { taskId = value_ }
              
            override var startTime: com.google.firebase.Timestamp
              get() = throw UnsupportedOperationException("getting builder values is not supported")
              set(value_) { startTime = value_ }
              
            override var endTime: com.google.firebase.Timestamp
              get() = throw UnsupportedOperationException("getting builder values is not supported")
              set(value_) { endTime = value_ }
              
            override var notes: String?
              get() = throw UnsupportedOperationException("getting builder values is not supported")
              set(value_) { notes = com.google.firebase.dataconnect.OptionalVariable.Value(value_) }
              
            
          }.apply(block_)
          .let {
            Variables(
              projectId=projectId,taskId=taskId,startTime=startTime,endTime=endTime,notes=notes,
            )
          }
        }
      }
    
  }
  

  
    @kotlinx.serialization.Serializable
  public data class Data(
  
    @kotlinx.serialization.SerialName("timeEntry_insert") val key: TimeEntryKey
  ) {
    
    
  }
  

  public companion object {
    public val operationName: String = "CreateTimeEntry"

    public val dataDeserializer: kotlinx.serialization.DeserializationStrategy<Data> =
      kotlinx.serialization.serializer()

    public val variablesSerializer: kotlinx.serialization.SerializationStrategy<Variables> =
      kotlinx.serialization.serializer()
  }
}

public fun CreateTimeEntryMutation.ref(
  
    projectId: java.util.UUID,taskId: java.util.UUID,startTime: com.google.firebase.Timestamp,endTime: com.google.firebase.Timestamp,
  
    block_: CreateTimeEntryMutation.Variables.Builder.() -> Unit = {}
  
): com.google.firebase.dataconnect.MutationRef<
    CreateTimeEntryMutation.Data,
    CreateTimeEntryMutation.Variables
  > =
  ref(
    
      CreateTimeEntryMutation.Variables.build(
        projectId=projectId,taskId=taskId,startTime=startTime,endTime=endTime,
  
    block_
      )
    
  )

public suspend fun CreateTimeEntryMutation.execute(
  
    projectId: java.util.UUID,taskId: java.util.UUID,startTime: com.google.firebase.Timestamp,endTime: com.google.firebase.Timestamp,
  
    block_: CreateTimeEntryMutation.Variables.Builder.() -> Unit = {}
  
  ): com.google.firebase.dataconnect.MutationResult<
    CreateTimeEntryMutation.Data,
    CreateTimeEntryMutation.Variables
  > =
  ref(
    
      projectId=projectId,taskId=taskId,startTime=startTime,endTime=endTime,
  
    block_
    
  ).execute()



// The lines below are used by the code generator to ensure that this file is deleted if it is no
// longer needed. Any files in this directory that contain the lines below will be deleted by the
// code generator if the file is no longer needed. If, for some reason, you do _not_ want the code
// generator to delete this file, then remove the line below (and this comment too, if you want).

// FIREBASE_DATA_CONNECT_GENERATED_FILE MARKER 42da5e14-69b3-401b-a9f1-e407bee89a78
// FIREBASE_DATA_CONNECT_GENERATED_FILE CONNECTOR example
